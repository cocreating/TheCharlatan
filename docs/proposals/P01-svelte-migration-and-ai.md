# P01 — Migración a Svelte + CSS nativo y evolución a AI

> Estado: **migración hecha (fases 0–4)** · **A1 (vocabulario por tema) implementada** · Fecha: 2026-09-29 · Rama: `claude/sharp-carson-f01lj0`

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Hosting | VPS propio con Node.js, en **https://themostimportant.page/about/charlatans** → SvelteKit con `adapter-node` y `paths.base = '/about/charlatans'` (ver `docs/artifacts/A50-deploy.md`) |
| Idioma | Solo inglés por ahora |
| API de AI | Privada, en el `.env` del servidor. De momento **Gemini (plan gratuito)**; el código admite también APIs compatibles con OpenAI (Groq, OpenRouter...) y Claude, elegidos por variables de entorno (`src/lib/server/ai/`) |
| GitHub Pages | Se retira el workflow de deploy; queda un workflow de CI (check, lint, test, build) |

## 1. Veredicto

**Viable, barata y de bajo riesgo.** El proyecto es pequeño (~1.800 líneas) y el
70 % del código ya es TypeScript independiente del framework. React solo se
usa como "pegamento" en 6 archivos. La migración se estima en **1–2 días de
trabajo** y se puede hacer en paralelo sin romper el deploy actual.

Recomendación: **SvelteKit (Svelte 5 con runes) + CSS nativo con scope por
componente**, con `adapter-node` en el VPS propio (ver §0).

## 2. Inventario: qué se conserva y qué se reescribe

| Archivo | Líneas | Depende de React | Acción |
|---|---:|:---:|---|
| `engine/walker.ts` | 55 | No | **Se conserva tal cual** |
| `engine/rules.ts` | 22 | No | Se conserva |
| `engine/validateGraph.ts` | 42 | No | Se conserva |
| `engine/audio.ts` (TTS) | 78 | No | Se conserva |
| `engine/ambient.ts` (Web Audio) | 114 | No | Se conserva |
| `engine/types.ts` | 30 | No | Se conserva |
| `viz/render.ts` (Canvas) | 108 | No | Se conserva |
| `viz/particles.ts` | 77 | No | Se conserva |
| `data/builder.ts` + `graph.seed.json` | 166 | No | Se conserva |
| `index.css` | 377 | No (ya es CSS nativo) | Se reparte en `<style>` de cada componente + `app.css` global con variables |
| `engine/store.ts` (Zustand) | 133 | Zustand | Reescribir como `store.svelte.ts` con `$state` (la lógica de `step/reset/manualJump` se copia) |
| `ui/App.tsx` (bucle principal) | 151 | Sí | Extraer el bucle a `engine/loop.ts` (TS puro) y dejar `App.svelte` mínimo |
| `viz/ForceGraph.tsx` | 237 | Sí | `ForceGraph.svelte` — más simple: sin `useRef`/`useCallback`, `bind:this` + `$effect` |
| `ui/Controls.tsx` | 108 | Sí | `Controls.svelte` con `bind:value` / `bind:checked`; estilos inline → CSS |
| `ui/StoryPanel.tsx` | 33 | Sí | `StoryPanel.svelte` |
| `ui/CinematicOverlay.tsx` | 19 | Sí | `CinematicOverlay.svelte` con `{#key node.id}` para reanimar |
| `main.tsx`, `App.css`, `assets/react.svg` | — | Sí | Se eliminan (`App.css` y `react.svg` ya no se usan) |

Dependencias que salen: `react`, `react-dom`, `zustand`, `@vitejs/plugin-react`,
`@types/react*`, `eslint-plugin-react-*`.
Entran: `svelte`, `@sveltejs/kit`, `@sveltejs/vite-plugin-svelte`,
`@sveltejs/adapter-static`, `svelte-check`, `eslint-plugin-svelte`.
Se mantienen: `d3-force`, `d3-drag`, `d3-selection`, `vite`, `typescript`.

### Por qué Svelte encaja especialmente bien aquí

- **El store es la parte que más gana**: hoy `ForceGraph` y el bucle leen
  `useStore.getState()` para esquivar closures obsoletos. Con una clase de
  `$state` la lectura siempre es la actual, sin trucos.
- **El canvas y D3 ya viven fuera del ciclo de render**; Svelte no añade
  VDOM, así que el tick a 60 fps no compite con reconciliación.
- **CSS nativo con scope** reemplaza los `style={{...}}` inline de
  `Controls.tsx` y `ForceGraph.tsx`. Las variables de color por tipo de nodo
  (`COLORS` en `render.ts`) pueden pasar a custom properties
  (`--c-subject`, …) compartidas entre canvas y DOM.
- Bundle más pequeño (React 19 + ReactDOM ≈ 60 kB gz → Svelte runtime ≈ 5–10 kB).

### Riesgos

| Riesgo | Mitigación |
|---|---|
| D3 muta `graph.nodes` (x, y, vx…). Si se envuelven en `$state` profundo, cada tick dispara reactividad | Guardar el grafo con `$state.raw` (sin proxy); la reactividad va en `activeNodeId`, `history`, `story` |
| Rutas en GitHub Pages (`/TheCharlatan/`) | `paths.base` en `svelte.config.js` leyendo `BASE_PATH`, igual que hoy en `vite.config.ts` |
| `speechSynthesis` / `AudioContext` en SSR | `export const ssr = false` en `+layout.ts` (es una app 100 % cliente) |
| Regresiones visuales | Checklist de paridad (§4) + capturas con Playwright antes/después |

## 3. Bugs detectados en el código actual (se corrigen en la migración)

1. `Controls.tsx:104` — `SEQ: {history.length}` usa **`window.history`** (no
   está importado del store): muestra la longitud del historial del navegador.
2. ~~`Controls.tsx:37` — etiqueta PLAY/PAUSE invertida~~ → **no es un bug**:
   es intencional (commit `76d7ba5`), el botón muestra el estado. Se mantiene.
3. `ForceGraph.tsx` — `particleEngine.update()` se llama **dos veces** por
   tick. Se conserva como `PARTICLE_STEPS_PER_FRAME = 2` para no cambiar el look.
3b. **El primer PLAY no reproducía**: `step()` llamaba a `reset()`, que ponía
   `isPlaying = false`; había que pulsar PLAY dos veces. Corregido.
4. `ForceGraph.tsx` — la simulación se destruye y recrea en cada resize
   (`size` en dependencias del efecto), reiniciando el layout.
5. `App.tsx` — `window.speechSynthesis.onvoiceschanged` nunca se limpia.
6. Docs (`technical_deep_dive.md`) mencionan tipos `predicate`/`junction` que
   no existen (`types.ts` usa `action`, `connector`, …).

## 4. Plan de migración (fases pequeñas, cada una desplegable)

**Fase 0 — Preparación (½ h)**
- Crear rama `svelte-migration`. Capturas de referencia con Playwright.
- Checklist de paridad: play/pausa, reset, clic en nodo = salto, tooltip,
  TTS con voz por defecto "Google UK English Female", velocidad de flujo y de
  voz, glitch (shake/invert + tartamudeo), ambient por tipo de nodo,
  partículas, overlay cinético por tipo, panel de historia con autoscroll y
  toggle, toggle de controles.

**Fase 1 — Scaffold (1–2 h)**
- `npx sv create` (SvelteKit, TS, sin Tailwind), `adapter-static`,
  `ssr = false`, `paths.base`.
- Mover `src/engine`, `src/viz/{render,particles}.ts`, `src/data` a `src/lib/`.
- Adaptar el workflow `deploy-pages.yml` (salida en `build/` en lugar de `dist/`).

**Fase 2 — Estado y bucle (2–3 h)**
- `src/lib/engine/store.svelte.ts`: clase `CharlatanState` con `$state`
  (`graph` con `$state.raw`), mismos métodos.
- `src/lib/engine/loop.ts`: el bucle de `App.tsx` como función
  `startLoop(state): () => void` — testeable sin UI.
- Tests unitarios con Vitest para `walker`, `validateGraph` y `step()`.

**Fase 3 — Componentes (3–4 h)**
- `ForceGraph.svelte`, `Controls.svelte`, `StoryPanel.svelte`,
  `CinematicOverlay.svelte`, `+page.svelte`.
- CSS: `app.css` global con custom properties (paleta, tipografía, z-index) +
  `<style>` por componente. Nada de estilos inline.

**Fase 4 — Paridad y limpieza (1–2 h)**
- Recorrer el checklist, comparar capturas, corregir bugs de §3.
- Eliminar dependencias de React, actualizar README y docs.
- Merge a `master` → deploy automático.

## 5. Evolución a AI

### 5.1 Arquitectura

La clave de API **no puede ir en el cliente** (GitHub Pages es estático y
cualquier clave en el bundle queda pública). Se necesita un proxy servidor:

```
Navegador (SvelteKit)
   │  fetch /api/*  (streaming SSE)
   ▼
Endpoint servidor  ── SvelteKit +server.ts (adapter-node en el VPS)
   │  src/lib/server/ai/  (clave en el .env del servidor)
   ▼
Gemini (gratis, por defecto) · API compatible con OpenAI · Claude
```

Con SvelteKit esto son archivos `src/routes/api/*/+server.ts` en el mismo
repo, servidos por el mismo proceso Node. La clave se lee con
`$env/dynamic/private` (desde el `.env` del servidor) y nunca llega al
navegador. Añadir un límite de uso por IP y un tope de `max_tokens` por
petición para controlar coste.

### 5.2 Features propuestas (de menor a mayor esfuerzo)

| # | Feature | Qué hace | Encaje con el motor actual |
|---|---|---|---|
| A1 | **Generador de vocabulario temático** | El usuario escribe un tema ("noir en Buenos Aires", "ciencia ficción sobre océanos") y Claude devuelve el vocabulario por tipo (`subject`, `action`, `space`, …) | Sustituye a `VOCABULARY` en `builder.ts`. La salida se fuerza con **structured outputs** (JSON Schema con los 7 tipos) y luego el **builder existente** crea los enlaces respetando `CONNECTION_RULES` y se pasa por `validateGraph`. El walker no cambia |
| A2 | **Narrador / "pulido"** | Cada N fragmentos del walker, Claude los reescribe como prosa fluida en el panel de historia (texto en streaming) y opcionalmente se lee por TTS | Nuevo modo en `StoryPanel`; el grafo sigue marcando el ritmo y el "azar" |
| A3 | **Oráculo** | El usuario hace una pregunta; el walker recorre el grafo y Claude interpreta el recorrido como una respuesta del "charlatán" | Usa `history` + `story` como entrada; encaja con el concepto del proyecto |
| A4 | **Grafos guardados y compartibles** | Guardar vocabularios/grafos generados y compartir por URL | Necesita persistencia (p. ej. Supabase o KV); `meta.seed` ya existe en el esquema |
| A5 | **Voces de mayor calidad** | Sustituir `speechSynthesis` por un TTS en la nube | Fuera de Claude; valorar después (coste por carácter) |

Orden sugerido: **A1 → A2 → A3**, dejando A4/A5 para cuando haya uso real.

### 5.3 Detalles técnicos de la API de Claude

- **SDK**: `@anthropic-ai/sdk` (TypeScript), solo en el servidor.
- **Modelo**: `claude-opus-5-5` por defecto. Si más adelante se quiere bajar
  latencia/coste en A2 (llamadas frecuentes y cortas), evaluar un modelo más
  pequeño midiendo calidad antes de cambiarlo.
- **Esfuerzo**: `output_config: { effort: "low" }` para A2 (texto corto y
  frecuente); `"medium"` para A1/A3. En Opus 5.5 el pensamiento no se puede
  desactivar: se controla con `effort`.
- **Structured outputs** (A1): `output_config.format` con JSON Schema
  (`additionalProperties: false`, los 7 tipos como arrays de strings con
  `minItems` según `NODE_COUNTS`). Nunca parsear por texto.
- **Streaming** (A2/A3): `client.messages.stream(...)` en el servidor,
  reenviado al navegador como SSE para que la prosa aparezca palabra a palabra.
- **Prompt caching**: el system prompt (voz del "charlatán", reglas de estilo,
  ejemplos) es estable → `cache_control: { type: "ephemeral" }`. Nada
  variable (fechas, IDs) antes del punto de caché.
- **Fallback de modelo**: activar `fallbacks: "default"` (beta
  `server-side-fallback-2026-07-01`) para que un rechazo del clasificador se
  reintente automáticamente en otro modelo.
- **Manejo de errores**: comprobar `stop_reason` (`refusal`, `max_tokens`)
  antes de usar el contenido; errores tipados del SDK (`RateLimitError`, …).
- **Fallback**: si la API falla, el sistema sigue funcionando con el
  `graph.seed.json` estático — la AI enriquece, no es imprescindible.

### 5.4 Estructura final propuesta

```
src/
  lib/
    engine/   walker.ts rules.ts validateGraph.ts audio.ts ambient.ts
              types.ts store.svelte.ts loop.ts
    viz/      render.ts particles.ts ForceGraph.svelte
    ui/       Controls.svelte StoryPanel.svelte CinematicOverlay.svelte
              ThemePrompt.svelte          ← A1
    data/     builder.ts graph.seed.json
    ai/       client.ts (fetch + SSE)     ← cliente del navegador
    server/   claude.ts prompts.ts schemas.ts   ← solo servidor
  routes/
    +layout.ts  (ssr = false)
    +page.svelte
    api/vocabulary/+server.ts   ← A1
    api/narrate/+server.ts      ← A2
    api/oracle/+server.ts       ← A3
  app.css
```

## 6. Decisiones pendientes

Resueltas:

1. **Rate limit**: límite por IP en memoria (`RATE_LIMIT_PER_HOUR`, 20 por
   defecto) + tope de gasto mensual en la consola de Anthropic.
2. **Primera feature de AI**: A1 (vocabulario por tema) — `POST /api/vocabulary`.
3. **Despliegue**: GitHub Actions → SSH → `scripts/deploy.sh` + pm2 (A50).

Siguientes: A2 (narrador en streaming) y A3 (oráculo).
