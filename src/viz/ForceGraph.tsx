
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import { useStore } from '../engine/store';
import { drawGraph, COLORS } from './render';
import { ParticleEngine } from './particles';
import type { Node, Link } from '../engine/types';

export function ForceGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const graph = useStore(state => state.graph);
  const activeNodeId = useStore(state => state.activeNodeId);
  const history = useStore(state => state.history);
  const manualJump = useStore(state => state.manualJump);

  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Particle System
  const particleEngine = useRef(new ParticleEngine());

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current;
            setSize({ w: offsetWidth, h: offsetHeight });

            if (simulationRef.current) {
                simulationRef.current.force('center', d3.forceCenter(offsetWidth / 2, offsetHeight / 2));
                simulationRef.current.alpha(0.3).restart();
            }
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Init Simulation
  useEffect(() => {
    if (!graph.nodes.length) return;

    // Destroy old if exists?
    if (simulationRef.current) simulationRef.current.stop();

    const nodes = graph.nodes;
    // Map links to objects needed by D3, but we must be careful if we re-run this effect
    // D3 mutates links: source/target become objects.
    // If we re-run, source might already be object.
    const links = graph.links.map(l => ({ ...l }));

    simulationRef.current = d3.forceSimulation(nodes)
        .force('link', d3.forceLink<Node, Link>(links).id((d: any) => d.id).distance(60))
        .force('charge', d3.forceManyBody().strength(-40))
        .force('center', d3.forceCenter(size.w / 2, size.h / 2))
        .force('collide', d3.forceCollide().radius(8));

    // Tick
    simulationRef.current.on('tick', () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            // Access latest state directly from store to avoid stale closures if this closure persists
            // But we can also rely on React props if we updated the closure?
            // D3 `on` callback is long-lived. Better use `useStore.getState()`.
            // D3 `on` callback is long-lived. Better use `useStore.getState()`.
            const state = useStore.getState();

            ctx.save();

            // Glitch Transformations
            if (state.isGlitching) {
                const shakeX = (Math.random() - 0.5) * 20;
                const shakeY = (Math.random() - 0.5) * 20;
                ctx.translate(shakeX, shakeY);

                if (Math.random() > 0.8) {
                    ctx.filter = 'invert(1)';
                }

                if (Math.random() > 0.9) {
                     ctx.scale(0.9 + Math.random() * 0.2, 0.9 + Math.random() * 0.2);
                }
            }

            // Draw Particles first (behind nodes)
            // Note: We need to clear inside drawGraph usually, or here.
            // drawGraph clears rect. So we should modify drawGraph or draw particles inside it?
            // Actually, let's keep drawGraph responsible for the "Graph" layer.
            // But we need to clear once per frame.
            // If drawGraph clears, we must draw particles AFTER or modify drawGraph to not clear?

            // Strategy: Let drawGraph clear. We draw particles ON TOP (smoke) or modify drawGraph.
            // Let's modify drawGraph? Or just accept particles on top for now?
            // Smoke usually overlays.

            // Wait, if it overlays, it might obscure text.
            // Ideally: Clear -> Particles -> Graph.

            // Let's hack: we clear here, then draw particles, then drawGraph (and tell it NOT to clear?)
            // drawGraph takes ctx.

            // Alternative: Pass particleEngine to drawGraph? No, separation of concerns.

            // Best rapid approach:
            // 1. Clear here.
            // 2. particleEngine.current.update(); particleEngine.current.draw(ctx);
            // 3. drawGraph(..., clear=false) << We need to add this param to drawGraph

            // For now, I will modify drawGraph in next step.
            // Here I will just call methods assuming I will fix drawGraph.

            // Temporary: We let drawGraph clear, then we draw particles on top.
            // It might look a bit busy but "Scent" trails can overlap.

            drawGraph(ctx, size.w, size.h, nodes, links, state.activeNodeId, state.history);

            particleEngine.current.update();
            particleEngine.current.update();
            particleEngine.current.draw(ctx);

            ctx.restore();
        }
    });

    // Cleanup
    return () => {
        if (simulationRef.current) simulationRef.current.stop();
    };
  }, [graph, size.w, size.h]); // Re-run if graph or size drastically changes (init)

  // Wake up simulation on state change
  useEffect(() => {
      if (simulationRef.current) {
          simulationRef.current.alpha(0.1).restart();
          // Also explicitly request a draw if simulation is somehow frozen?
          // No, restart triggers tick.
      }
  }, [activeNodeId, history]);

  // Emit Particles on Active Node Change
  useEffect(() => {
     if (activeNodeId) {
         const node = graph.nodes.find(n => n.id === activeNodeId);
         if (node && node.x && node.y) {
             const color = COLORS[node.type] || '#fff';
             particleEngine.current.emit(node.x, node.y, color);
         }
     }
  }, [activeNodeId, graph.nodes]);

  const handleClick = useCallback((e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const nodes = graph.nodes;
      let found: Node | null = null;
      let minDist = 20;

      for (const node of nodes) {
          if (node.x === undefined || node.y === undefined) continue;
          const dx = x - node.x;
          const dy = y - node.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) {
              minDist = dist;
              found = node;
          }
      }

      if (found) {
          manualJump(found.id);
      }
  }, [graph, manualJump]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const nodes = graph.nodes;
      let found: Node | null = null;
      let minDist = 15;

      for (const node of nodes) {
          if (node.x === undefined || node.y === undefined) continue;
          const dx = x - node.x;
          const dy = y - node.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < minDist) {
              minDist = dist;
              found = node;
          }
      }

      setHoveredNode(found);
      setTooltipPos({ x: e.clientX, y: e.clientY });
  }, [graph]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#111' }}>
        <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            style={{ display: 'block', cursor: hoveredNode ? 'pointer' : 'default' }}
        />
        {hoveredNode && (
            <div style={{
                position: 'fixed',
                left: tooltipPos.x + 10,
                top: tooltipPos.y + 10,
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                pointerEvents: 'none',
                zIndex: 10
            }}>
                <span style={{ color: '#aaa', fontSize: '0.7em', display: 'block' }}>{hoveredNode.type}</span>
                {hoveredNode.text}
            </div>
        )}
    </div>
  );
}
