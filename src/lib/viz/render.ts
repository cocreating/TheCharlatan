import type { DiceCandidate, Node, Link, NodeType } from '../engine/types';

/** Word-type colours. Fallbacks match the `--c-*` tokens in app.css; `loadThemeColors` syncs them. */
export const COLORS: Record<NodeType, string> = {
  subject: '#f2efe9',
  action: '#ff6b6b',
  space: '#6ea8ff',
  time: '#ffd166',
  state: '#3ddbb0',
  object: '#f78fe6',
  connector: '#9d9ca8'
};

/** Canvas surfaces, also mirrored from app.css. */
const THEME = {
  bg: '#07070a',
  bgGlow: '#15141c',
  link: '#2c2c36',
  text: '#ecebe6',
  font: 'ui-monospace, monospace'
};

/** Read the CSS tokens so the graph, the story and the overlay share one palette. */
export function loadThemeColors(el: Element = document.documentElement) {
  const css = getComputedStyle(el);
  const read = (name: string) => css.getPropertyValue(name).trim();
  for (const type of Object.keys(COLORS) as NodeType[]) {
    COLORS[type] = read(`--c-${type}`) || COLORS[type];
  }
  THEME.bg = read('--bg') || THEME.bg;
  THEME.bgGlow = read('--bg-glow') || THEME.bgGlow;
  THEME.link = read('--border') || THEME.link;
  THEME.text = read('--text') || THEME.text;
  THEME.font = read('--font-ui') || THEME.font;
}

const TRAIL_LENGTH = 10; // Number of recent steps to highlight
const TRAIL_LABELS = 4; // The newest few trail words keep a fading label
const MAX_DICE_LABELS = 8; // Past this many options (the opening roll), only the chosen one is labelled
const GHOST_MIN_ALPHA = 0.12; // Unchosen branches fade down to this

/** One roll of the dice drawn over the graph during the oracle's replay. */
export interface DiceOverlay {
  /** The node the walker was on (null for the opening roll). */
  from: string | null;
  candidates: DiceCandidate[];
  chosen: string;
  /** 0 when the roll appears, 1 once the unchosen branches have faded. */
  fade: number;
}

const hasPos = (n: Node | undefined): n is Node & { x: number; y: number } =>
  n?.x !== undefined && n.y !== undefined;

export function drawGraph(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  links: Link[],
  activeNodeId: string | null,
  history: string[],
  dice: DiceOverlay | null = null
) {
  ctx.clearRect(0, 0, width, height);

  // Background: a soft glow in the middle fading to the page colour
  const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) / 2);
  bg.addColorStop(0, THEME.bgGlow);
  bg.addColorStop(1, THEME.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const byId = new Map(nodes.map(n => [n.id, n]));
  const recent = history.slice(-TRAIL_LENGTH);
  // Age of each trail node: 0 is the newest
  const age = new Map<string, number>();
  recent.forEach((id, i) => age.set(id, recent.length - 1 - i));

  // Links, all dim
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = THEME.link;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (const link of links) {
    const source = link.source as Node;
    const target = link.target as Node;
    if (!hasPos(source) || !hasPos(target)) continue;
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
  }
  ctx.stroke();

  // History trail: each segment takes the colour of the word it led to, and fades with age
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  for (let i = 0; i < recent.length - 1; i++) {
    const u = byId.get(recent[i]);
    const v = byId.get(recent[i + 1]);
    if (!hasPos(u) || !hasPos(v)) continue;
    const segAge = recent.length - 2 - i; // 0 is the newest segment
    const color = COLORS[v.type] || THEME.text;
    ctx.globalAlpha = 0.9 * (1 - segAge / TRAIL_LENGTH);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.stroke();
  }
  ctx.restore();

  // Nodes
  ctx.globalAlpha = 1;
  let active: (Node & { x: number; y: number }) | null = null;
  for (const node of nodes) {
    if (!hasPos(node)) continue;
    if (node.id === activeNodeId) {
      active = node;
      continue; // Drawn last, on top
    }
    const nodeAge = age.get(node.id);
    ctx.globalAlpha = nodeAge === undefined ? 0.75 : 1;
    ctx.fillStyle = COLORS[node.type] || THEME.text;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeAge === undefined ? 2.5 : 4.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Fading labels on the last few words of the trail
  ctx.font = `11px ${THEME.font}`;
  ctx.fillStyle = THEME.text;
  for (const [id, nodeAge] of age) {
    const node = byId.get(id);
    if (nodeAge === 0 || nodeAge > TRAIL_LABELS || !hasPos(node)) continue;
    ctx.globalAlpha = 0.6 * (1 - nodeAge / (TRAIL_LABELS + 1));
    ctx.fillText(node.text, node.x + 8, node.y + 4);
  }

  // Active node: glow, core and label
  if (active) {
    const color = COLORS[active.type] || THEME.text;
    const glow = ctx.createRadialGradient(active.x, active.y, 0, active.x, active.y, 28);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(active.x, active.y, 28, 0, 2 * Math.PI);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(active.x, active.y, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = THEME.text;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `500 13px ${THEME.font}`;
    ctx.fillStyle = THEME.text;
    ctx.shadowColor = THEME.bg;
    ctx.shadowBlur = 6;
    ctx.fillText(active.text, active.x + 14, active.y + 4);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  if (dice) drawDice(ctx, nodes, dice);
}

/** Every option the walker had: thickness = probability; the unchosen fade away like ghost branches. */
function drawDice(ctx: CanvasRenderingContext2D, nodes: Node[], dice: DiceOverlay) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const from = dice.from ? byId.get(dice.from) : undefined;
  const ghost = GHOST_MIN_ALPHA + (1 - GHOST_MIN_ALPHA) * Math.max(0, 1 - dice.fade);
  const labelAll = dice.candidates.length <= MAX_DICE_LABELS;

  ctx.save();
  ctx.font = `11px ${THEME.font}`;
  for (const c of dice.candidates) {
    const node = byId.get(c.id);
    if (node?.x === undefined || node.y === undefined) continue;
    const chosen = c.id === dice.chosen;
    const color = chosen ? THEME.text : COLORS[node.type] || THEME.text;
    ctx.globalAlpha = chosen ? 1 : ghost;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (from?.x !== undefined && from.y !== undefined) {
      ctx.setLineDash(chosen ? [] : [4, 4]);
      ctx.lineWidth = 1 + 7 * c.p;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.lineWidth = chosen ? 2 : 1;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 6 + 12 * c.p, 0, 2 * Math.PI);
    ctx.stroke();

    if (chosen || labelAll) {
      ctx.fillText(`${node.text} ${Math.round(c.p * 100)}%`, node.x + 14, node.y - 10);
    }
  }
  ctx.restore();
}
