# P02 — El oráculo que se desenmascara + memoria en Supabase

> Estado: **código escrito en la rama `p02-oracle` (WIP)** · falta cerrar check/tests/docs, ver §6 · Supabase TMI listo y variables puestas en el VPS · Fecha: 2026-09-30

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Idea central | Un charlatán funciona porque el público pone el sentido. El espectador cae en el truco y luego lo ve desmontado. |
| Alcance de esta fase | Solo dos pasos: **Pregúntale al oráculo** + **Enseña los dados**. Lo demás (aplausos que entrenan, máscaras) queda para después. |
| Persistencia | Supabase, proyecto **TMI** (`dsfqnjdhkknnxbdeqdml`, eu-central-1), el del sitio principal. Tablas con prefijo `charlatan_` en `public`. |
| Acceso | Solo desde el servidor SvelteKit con la clave secreta. RLS activado sin políticas; `anon`/`authenticated` sin permisos. |
| Ahorro de tokens | Los vocabularios generados por la IA se guardan y se reutilizan por tema (hasta 3 variantes). |
| Texto predictivo | Al escribir un tema se sugieren los ya guardados (prefijo → parecidos → más usados). |
| Moderación | Columna `listed`: a `false`, el tema deja de sugerirse (sigue funcionando si se escribe exacto). |
| Idioma | Inglés, como en P01 (`lang` por defecto `'en'`). |

## 1. La experiencia

**Paso 1 — Ask the oracle.** El visitante escribe una pregunta personal. El
charlatán responde con su paseo aleatorio (voz, grafo, ritual). Al terminar,
una sola pregunta: *"Did it speak to you?"* — Yes / No.

**Paso 2 — Show the dice.** La misma respuesta se repite despacio. En cada
palabra se ven los candidatos que había, su probabilidad y cuál salió; los
caminos no elegidos se desvanecen como ramas fantasma. Cierra con el dato
real: *"N% of people felt a random answer was meant for them. So did you."*
(si respondió No: *"You didn't. N% did."*, o el texto que se decida).

Nota: las respuestas del oráculo **no gastan tokens** — salen del walker en el
navegador. La IA solo se usa para generar vocabulario a partir de un tema.

## 2. Base de datos (ya aplicada)

Esquema completo en `supabase/migrations/20260930_charlatan_oracle.sql`.

| Objeto | Para qué |
|---|---|
| `charlatan_vocabularies` | Caché de vocabularios IA: `theme_key` (normalizado), `theme` (tal cual), `lang`, `variant` 1–3, `provider`, `model`, `prompt_version`, `graph` (jsonb), `hits`, `listed`. Único por `(theme_key, lang, prompt_version, variant)`. Índice trigram en `theme_key`. |
| `charlatan_sessions` | Una fila por consulta: `vocabulary_id` (null = grafo base), `question` (null si el visitante no quiere guardarla, máx. 500), `answer`, `steps` (jsonb), `seed`, `felt_meaning` (null hasta que responde), `lang`. |
| `charlatan_suggest_themes(q, p_lang, p_limit)` | Autocompletado. Devuelve `theme_key`, `theme`, `hits`. |
| `charlatan_vocabulary_hit(p_id)` | Suma 1 a `hits` de forma atómica. |
| `charlatan_meaning_stats()` | `answered`, `felt_meaning`, `pct` para el cierre del paso 2. |

Cambiar `prompt_version` al tocar el prompt de `src/lib/server/ai/` invalida la
caché de forma natural (los vocabularios viejos no se sirven con el prompt nuevo).

Ocultar un tema de las sugerencias:

```sql
update charlatan_vocabularies set listed = false where theme_key = '...';
```

## 3. Implementación pendiente

### 3.1 Configuración
- `npm i @supabase/supabase-js`
- `.env` del VPS y `.env.example`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
  (clave secreta / service role de TMI). **Nunca** en código de cliente ni con
  prefijo `PUBLIC_`.
- `src/lib/server/db.ts`: cliente único (`persistSession: false`). Si faltan
  las variables, todo sigue funcionando sin guardar nada (como hoy sin IA).

### 3.2 Normalización del tema (compartida)
`normalizeTheme(s)`: `trim` → minúsculas → `normalize('NFD')` y quitar
diacríticos → colapsar espacios. La misma función para guardar y para buscar.
Con test.

### 3.3 Endpoints
| Ruta | Qué hace |
|---|---|
| `GET /api/themes/suggest?q=` | `q` normalizado, mínimo 2 caracteres, máx. 60. Llama a `charlatan_suggest_themes`. Rate limit ligero. |
| `POST /api/vocabulary` (existente) | Antes de llamar a la IA busca en caché por `theme_key` + `lang` + `prompt_version`. Si hay variantes: si hay menos de 3, con cierta probabilidad genera una nueva; si no, elige una al azar y llama a `charlatan_vocabulary_hit`. Si no hay: genera, valida el grafo y guarda. El rate limit de IA solo cuenta cuando de verdad se llama a la IA. Devuelve también `vocabularyId`. |
| `POST /api/sessions` | Guarda `question`, `answer`, `steps`, `seed`, `vocabularyId`. Devuelve `id`. |
| `PATCH /api/sessions/[id]` | Guarda `felt_meaning`. Devuelve `charlatan_meaning_stats()`. |

Validar todo en el servidor (longitudes, tipos, tamaño de `steps`). No guardar IP.

### 3.4 Motor
- `walker.ts`: `selectNextNode` debe poder devolver, además del elegido, los
  candidatos con su probabilidad final (tras la penalización por historial).
  Sin romper la firma actual (función nueva o parámetro opcional).
- PRNG con semilla (p. ej. mulberry32) inyectable en el walker para poder
  reproducir una respuesta con `seed` + vocabulario.
- El store registra cada paso de la consulta en `steps`:
  `[{ node, candidates: [{ id, p }], roll }]`.

### 3.5 UI
- `ThemePrompt.svelte`: desplegable de sugerencias con debounce ~250 ms,
  navegable con teclado (↑ ↓ Enter Esc), `role="combobox"` / `listbox`. Elegir
  una sugerencia carga el vocabulario guardado sin IA.
- Nuevo flujo del oráculo: campo de pregunta → respuesta → *Did it speak to
  you?* → repetición lenta con los dados en el grafo (`src/lib/viz/render.ts`:
  candidatos resaltados, ramas no elegidas que se desvanecen) → porcentaje.
- Aviso discreto junto a la pregunta: *"Your question is kept anonymously as
  part of the piece"* + casilla para no guardar el texto (entonces
  `question = null`; el Yes/No sí se guarda).

## 4. Privacidad

Las preguntas serán personales y el público está en la UE. Sin IP ni datos
identificables; sesiones nunca públicas; opción de no guardar el texto. Si en
el futuro se muestran preguntas de otros, hará falta moderación previa.

## 5. Después (fuera de esta fase)
- **Aplausos que entrenan**: reacciones del público que ajustan pesos en un
  grafo compartido; el charlatán aprende a decir lo que la gente quiere oír.
- **Máscaras**: gurú, político, CEO, astrólogo diciendo exactamente lo mismo.
- **Enlace a una sesión** (`/s/[id]`) para volver a ver una respuesta.

## 6. Estado de la implementación (relevo, 2026-09-30)

Código escrito en local (Mac) y subido como WIP a la rama `p02-oracle`. **No** pasa aún
`npm run check`; tests nuevos sin escribir. No hacer merge a `master` hasta cerrar la lista de abajo.

### Hecho
| Pieza | Archivos |
|---|---|
| PRNG con semilla (mulberry32) | `src/lib/engine/random.ts` |
| Walker con dados: `weighNextNodes`, `rollAmong`, `selectNextStep` (firma de `selectNextNode` intacta) | `src/lib/engine/walker.ts`, tipos `DiceCandidate`/`DiceStep` en `types.ts` |
| Store: `mode` (`free`/`answering`/`frozen`), `trace`, `answerDone`, `dice`, `vocabularyId`; `beginAnswer`, `freeze`, `showRoll`, `endOracle`. En modo oracle se ignoran reset, saltos y cambio de grafo | `src/lib/engine/store.svelte.ts` |
| Reglas de la respuesta (8–16 fragmentos, termina en object/space/time/state), `answerText`, `revealLines` | `src/lib/oracle/answer.ts` |
| Orquestación del oráculo (fases `idle → answering → asking → replaying → revealed`, replay cancelable) | `src/lib/oracle/oracle.svelte.ts`, cliente HTTP en `src/lib/oracle/api.ts` |
| `normalizeTheme` compartido | `src/lib/themes.ts` |
| Cliente Supabase (null sin variables) | `src/lib/server/db.ts` |
| Caché de vocabularios (`findVariants`, `nextVariant`, `saveVariant`, `recordHit`, `suggestThemes`) | `src/lib/server/vocabularyCache.ts` |
| `describeProvider` (provider/model a guardar); `PROMPT_VERSION = 'v1'` | `src/lib/server/ai/index.ts`, `prompt.ts` |
| `POST /api/vocabulary`: caché primero, hasta 3 variantes (30 % de probabilidad de nueva), `cachedOnly`, fallback a caché si la IA falla o hay rate limit; devuelve `vocabularyId` | `src/routes/api/vocabulary/+server.ts` |
| `GET /api/themes/suggest`, `POST /api/sessions`, `PATCH /api/sessions/[id]` + validación | `src/routes/api/...`, `src/lib/server/sessions.ts` |
| UI: autocompletado (combobox) en `ThemePrompt`; `OraclePanel` (pregunta, aviso + casilla, Yes/No, dados con barra y lista, porcentaje); columna izquierda en la página; Controls desactivados según `mode` | `src/lib/ui/*.svelte`, `src/routes/+page.svelte`, `src/app.css` |
| Dados en el canvas: ramas con grosor ∝ p, las no elegidas se desvanecen | `src/lib/viz/render.ts` (`drawDice`), `ForceGraph.svelte` |
| Dependencia `@supabase/supabase-js` | `package.json` |

### Pendiente
1. **Error de tipos** en `oracle.svelte.ts` (`respond`): tras `await this.replay()` TS estrecha `phase` a `'asking'` y marca
   `this.phase === 'replaying'` como imposible. Arreglar sin trucos (p. ej. `replay()` devuelve si terminó o fue cancelado).
2. **Aviso a11y** en los `<li role="option">` de `ThemePrompt`: el teclado se gestiona en el input (patrón
   `aria-activedescendant`); justificar con `<!-- svelte-ignore a11y_click_events_have_key_events -->` o equivalente.
3. **Lint**: en local solo fallaba `dist/` (resto ignorado por git del antiguo build de React); añadir `dist` a
   `globalIgnores` en `eslint.config.js` igualmente.
4. **Tests**: correr los existentes (store/walker/vocabulary pueden necesitar ajustes) y añadir: `normalizeTheme`,
   reproducibilidad del walker con semilla y `rollAmong`, `isAnswerComplete`/`answerText`/`revealLines`,
   `parseSessionInput`, `nextVariant`, `/api/vocabulary` con caché mockeada (`$lib/server/db` + `vocabularyCache`):
   hit sin IA, `cachedOnly`, fallback con IA ocupada y con rate limit, guardado de variante nueva.
5. **Probar en el navegador** (`npm run dev`): flujo completo del oráculo con y sin TTS, SKIP, STOP, autocompletado
   con teclado. Sin variables de Supabase en local: todo debe funcionar sin guardar.
6. **Docs**: `.env.example` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`), `CLAUDE.md` (mapa + estado), entrada en
   `.agents/context/decisions.md`, y esta propuesta a «implementada».
7. PR a `master` con check, lint y test en verde. El merge despliega (CI).

### Servidor
`SUPABASE_URL` y `SUPABASE_SECRET_KEY` (clave `sb_secret_…` propia de Charlatans) ya están en el `.env` del VPS;
verificado el 2026-09-30 que la clave lee `charlatan_meaning_stats` y `charlatan_vocabularies`. El proceso pm2 las
cogerá en el `pm2 reload` del próximo deploy.

### Nota de entorno
En la shell de Desktop Commander del Mac, `NODE_ENV=production`: `npm install` quita las devDependencies.
Usar `env -u NODE_ENV npm install`.

