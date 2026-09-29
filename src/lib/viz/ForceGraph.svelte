<script lang="ts">
  import { untrack } from 'svelte';
  import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    type Simulation,
  } from 'd3-force';
  import { charlatan } from '$lib/engine/store.svelte';
  import type { Node, Link } from '$lib/engine/types';
  import { drawGraph, COLORS } from './render';
  import { ParticleEngine } from './particles';

  const CLICK_RADIUS = 20;
  const HOVER_RADIUS = 15;
  const PARTICLE_STEPS_PER_FRAME = 2;

  let canvas: HTMLCanvasElement;
  let width = $state(800);
  let height = $state(600);
  let hoveredNode = $state<Node | null>(null);
  let tooltipPos = $state({ x: 0, y: 0 });

  // Plain (non-reactive) handles owned by the render loop.
  const particles = new ParticleEngine();
  let simulation: Simulation<Node, Link> | null = null;
  let simLinks: Link[] = [];

  // Init Simulation (re-runs only when a new graph is loaded)
  $effect(() => {
    const nodes = charlatan.graph.nodes;
    // D3 mutates links (source/target become objects), so hand it copies.
    const links = charlatan.graph.links.map(l => ({ ...l }));

    const sim = untrack(() =>
      forceSimulation<Node, Link>(nodes)
        .force('link', forceLink<Node, Link>(links).id(d => d.id).distance(60))
        .force('charge', forceManyBody().strength(-40))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide(8)),
    );

    simulation = sim;
    simLinks = links;
    return () => sim.stop();
  });

  // Handle Resize: re-center without rebuilding the layout
  $effect(() => {
    const [w, h] = [width, height];
    untrack(() => {
      simulation?.force('center', forceCenter(w / 2, h / 2));
      simulation?.alpha(0.3).restart();
    });
  });

  // Wake up simulation on every step, jump or reset
  $effect(() => {
    void charlatan.history;
    untrack(() => simulation?.alpha(0.1).restart());
  });

  // Emit Particles on Active Node Change
  $effect(() => {
    const node = charlatan.activeNode;
    if (node?.x !== undefined && node.y !== undefined) {
      particles.emit(node.x, node.y, COLORS[node.type] || '#fff');
    }
  });

  // Render loop: runs every animation frame so particles and glitches keep
  // moving after the physics simulation has cooled down.
  $effect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const frame = () => {
      drawFrame(ctx);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  function drawFrame(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Glitch Transformations
    if (charlatan.isGlitching) {
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

    // drawGraph clears the frame, so particles are drawn on top (smoke overlays the graph).
    drawGraph(ctx, width, height, charlatan.graph.nodes, simLinks, charlatan.activeNodeId, charlatan.history);

    for (let i = 0; i < PARTICLE_STEPS_PER_FRAME; i++) particles.update();
    particles.draw(ctx);

    ctx.restore();
  }

  function nodeAt(e: MouseEvent, radius: number): Node | null {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: Node | null = null;
    let minDist = radius;
    for (const node of charlatan.graph.nodes) {
      if (node.x === undefined || node.y === undefined) continue;
      const dist = Math.hypot(x - node.x, y - node.y);
      if (dist < minDist) {
        minDist = dist;
        found = node;
      }
    }
    return found;
  }

  function handleClick(e: MouseEvent) {
    const node = nodeAt(e, CLICK_RADIUS);
    if (node) charlatan.manualJump(node.id);
  }

  function handleMouseMove(e: MouseEvent) {
    hoveredNode = nodeAt(e, HOVER_RADIUS);
    tooltipPos = { x: e.clientX, y: e.clientY };
  }
</script>

<div class="graph" bind:clientWidth={width} bind:clientHeight={height}>
  <canvas
    bind:this={canvas}
    {width}
    {height}
    class:pointer={hoveredNode !== null}
    onclick={handleClick}
    onmousemove={handleMouseMove}
    onmouseleave={() => (hoveredNode = null)}
  ></canvas>
  {#if hoveredNode}
    <div class="tooltip" style:left="{tooltipPos.x + 10}px" style:top="{tooltipPos.y + 10}px">
      <span class="tooltip-type">{hoveredNode.type}</span>
      {hoveredNode.text}
    </div>
  {/if}
</div>

<style>
  .graph {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #111;
  }

  canvas {
    display: block;
    cursor: default;
  }

  canvas.pointer {
    cursor: pointer;
  }

  .tooltip {
    position: fixed;
    background: rgb(0 0 0 / 80%);
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    pointer-events: none;
    z-index: 10;
  }

  .tooltip-type {
    display: block;
    color: #aaa;
    font-size: 0.7em;
  }
</style>
