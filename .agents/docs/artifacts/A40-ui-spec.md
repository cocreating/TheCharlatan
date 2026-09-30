# A40 - UI Spec

## Layout
- **Full-bleed graph** above an in-flow controls bar; panels float over the graph.
- **Desktop**: Theme + Oracle top left, Story on the right edge (full height), controls bar at the bottom.
- **Mobile (< 768px)**: Theme + Oracle (folded) on top, Story docked at the bottom, controls wrap onto two rows.
- **Intro**: a modal dialog opens the piece (see below); the page behind is inert until it closes.

## Components
- **IntroScreen**: native `<dialog>` + `showModal()`. Title, short lede, two buttons:
  BEGIN WITH SOUND (turns AUDIO on) and BEGIN IN SILENCE; both start playback. Escape begins in silence.
  The click is the user gesture browsers require before speech and Web Audio. Shown on every load.
- **ForceGraph**: Interactive canvas. Click to jump. Hover for tooltip (type + text).
- **CinematicOverlay**: the current word, large, animated per type (serif, type colour).
- **ThemePrompt** / **OraclePanel**: see P01 / P02. On mobile the oracle's idle form starts folded behind an
  ASK THE ORACLE toggle (`aria-expanded`; opening it focuses the question); the other phases always show.
- **StoryPanel**: header (STORY, word count, HIDE/SHOW), auto-scrolling fragments coloured by type,
  collapsible colour legend ("What do the colours mean?").
- **Controls** (right-aligned, in this order): `SEQ n` · Flow / Voice speed sliders (0.5×–3×) ·
  voice select (when AUDIO is on) · AUDIO and GLITCH toggle buttons (`aria-pressed`) · RESET · PLAY/PAUSE.
  The PLAY/PAUSE label shows the current state. The bar collapses behind a CONTROLS tab.

## Styling
- **Tokens only**: every colour, font and radius is a CSS custom property in `src/app.css`
  (surfaces, text levels `--text` / `--text-dim` / `--text-faint`, `--accent`, `--c-<type>`).
  Components never hard-code colours; the canvas reads the same tokens (A30).
- **Fonts** (self-hosted with Fontsource, no third-party requests):
  IBM Plex Mono for the UI, Fraunces for story text, oracle answers, the overlay and the intro title.
- **Theme**: dark, translucent blurred panels, subtle film grain (`body::after`).
- **Accessibility**: `:focus-visible` outlines; `prefers-reduced-motion` shortens CSS animations,
  shows the overlay word without motion and disables the glitch shake.
