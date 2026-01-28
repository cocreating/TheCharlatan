# A30 - Visualization Spec

## Technology
- **Library**: `d3-force` for simulation, HTML5 `<canvas>` for rendering.
- **Performance**: Capable of 60fps with >200 nodes.

## Forces
- **Link**: distance 60px
- **Charge**: -40 (repulsion)
- **Collide**: radius 8px (prevention of overlap)
- **Center**: Gravity to canvas center.

## Aesthetics
- **Background**: Dark (`#050505`)
- **Nodes**: Colored by semantic type. Active node highlighted with halo.
- **Links**: Faint lines.
- **Trails**: Last 10 steps highlighted with fading opacity.
