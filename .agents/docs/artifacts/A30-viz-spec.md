# A30 - Visualization Spec

## Technology
- **Library**: `d3-force` for simulation, HTML5 `<canvas>` for rendering.
- **Performance**: Capable of 60fps with >200 nodes.
- **Resolution**: backing store scaled by `devicePixelRatio` (capped at 2), so the graph is crisp on retina screens.

## Forces
- **Link**: distance 60px
- **Charge**: -40 (repulsion)
- **Collide**: radius 8px (prevention of overlap)
- **Center**: Gravity to canvas center.

## Aesthetics
- **Palette**: `loadThemeColors()` in `render.ts` reads the CSS tokens from `src/app.css`
  (`--c-<type>`, `--bg`, `--bg-glow`, `--border`, `--text`, `--font-ui`); the values in `render.ts` are only fallbacks.
- **Background**: radial glow (`--bg-glow`) fading to `--bg`.
- **Nodes**: Coloured by semantic type; trail nodes slightly larger.
- **Active node**: radial glow in its type colour, outlined core and label.
- **Links**: Faint lines.
- **Trails**: Last 10 steps; each segment takes the colour of the word it led to, fading with age.
  The newest 4 trail words keep a fading label.
- **Particles**: smoke burst in the type colour on every step.
- **Glitch**: canvas shake/invert/scale when GLITCH is on (no shake under reduced motion).
- **Dice** (oracle replay): see P02.
