import type { Node, Link, NodeType } from '../engine/types';

export const COLORS: Record<NodeType, string> = {
  subject: '#ffffff',
  action: '#ff4d4d',   // Crimson
  space: '#4d4dff',    // Blue
  time: '#ffd700',     // Gold
  state: '#00ffcc',    // Teal
  object: '#ff00ff',   // Magenta
  connector: '#888888' // Grey
};

const TRAIL_LENGTH = 10; // Number of recent steps to highlight

export function drawGraph(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  links: Link[],
  activeNodeId: string | null,
  history: string[]
) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, width, height);

  // Draw Links
  ctx.lineWidth = 0.5;
  links.forEach(link => {
    const source = link.source as Node;
    const target = link.target as Node;

    // Check if link is in recent history
    // Only if source and target are consecutive in history?
    // Doing strict path checking is expensive every frame.
    // Let's just draw all links dim first.

    ctx.strokeStyle = '#333';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(source.x!, source.y!);
    ctx.lineTo(target.x!, target.y!);
    ctx.stroke();
  });

  // Draw History Trail
  if (history.length > 1) {
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;

      // Get recent path
      const recent = history.slice(-TRAIL_LENGTH);
      for (let i = 0; i < recent.length - 1; i++) {
          const uId = recent[i];
          const vId = recent[i+1];
          const u = nodes.find(n => n.id === uId);
          const v = nodes.find(n => n.id === vId);
          if (u && v && u.x && v.x) {
              const age = recent.length - 1 - i; // 0 is most recent link
              const opacity = 1 - (age / TRAIL_LENGTH);

              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.beginPath();
              ctx.moveTo(u.x!, u.y!);
              ctx.lineTo(v.x!, v.y!);
              ctx.stroke();
          }
      }
  }

  // Draw Nodes
  ctx.globalAlpha = 1;
  nodes.forEach(node => {
    const isActive = node.id === activeNodeId;
    const isRecent = history.slice(-TRAIL_LENGTH).includes(node.id);

    // Size
    let r = 3;
    if (isActive) r = 8;
    else if (isRecent) r = 5;

    ctx.fillStyle = COLORS[node.type] || '#fff';

    // Halo for active
    if (isActive) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r + 5, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
        ctx.fill();
        ctx.fillStyle = COLORS[node.type]; // restore
    }

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
    ctx.fill();

    // Text label for active or hovered (hover logic handled in component usually, or here if we pass hoveredNode)
    // For now only active
    if (isActive) {
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(node.text, node.x! + 12, node.y! + 4);
    }
  });
}
