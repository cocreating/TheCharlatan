# P03 — Coherent charlatanry: stories that hold together

> Status: **phases 1 + 2 merged and live** (PR #9) · **phase 3 implemented** on branch `claude/lucid-planck-hikkqf` · phase 4 proposed · Date: 2026-09-30

## 0. The problem

Testing the live app, the owner found the stories too disconnected: a pool of concepts rather than something a
listener can follow. A real walk over the seed graph (before this proposal):

> the vibration | volatile | at the vanishing point | signals | beyond the screen | hollow | encounters | absolute |
> between the layers | infinite | through the labyrinth | slowly | erases | the lens | instead | abstract

The goal is not realism. The charlatan should still sound strange, but a listener must be able to *follow* it:
who is doing what, and what it is about.

## 1. Diagnosis

| # | Cause | Where |
|---|---|---|
| 1 | The type rules do not make sentences. `subject → state` ("the vibration volatile"), `state → action` (a verb with no subject), `action → state / space` ("dissolves into abstract"), `object → subject` (two nouns in a row). No sentence ever ends: no full stops, no capitals, no pauses in the voice. | `src/lib/engine/rules.ts` |
| 2 | The walker punishes continuity. Every node visited in the last 20 steps is 10× less likely, so the story always moves to something new; coherent text does the opposite and keeps coming back to its referents. The subject changes every 3–4 fragments. | `src/lib/engine/walker.ts` |
| 3 | Links are pure chance: 3 uniform targets per node, all weight 1. No affinity of meaning. | `src/lib/data/buildGraph.ts` |
| 4 | The AI writes every fragment in isolation (a list per type), very abstract ("eerie, poetic"), with no idea of what goes with what. | `src/lib/server/ai/prompt.ts` |

## 2. Options (cheapest first)

1. **Sentence grammar (no AI).** The walker follows sentence shapes instead of a loose type table.
2. **Thematic thread (no AI).** The story keeps coming back to its nouns: the object of one sentence becomes the
   subject of the next, the same character goes on, a second mention says "the" instead of "a".
3. **Scenes / motifs in the vocabulary (AI, prompt v3).** The AI groups the vocabulary into 3–5 scenes; links stay
   mostly inside a scene with a few bridges. Local coherence plus drift, and visible clusters in the force graph.
4. **AI narrator (A2 on the P01 roadmap).** The dice still pick the fragments; an LLM rewrites each sentence as
   fluent prose. Most coherent, but one call per sentence (latency, free-tier limits), nothing without a key
   (Vercel previews), a new loop/TTS rhythm, and it clashes with the oracle's reveal ("There was nothing there
   to find") unless the raw words stay visible.

**Decision:** 1 + 2 first (free, deterministic, works with the seed graph, locally and in previews, and keeps the
concept: *the dice choose, the grammar only makes it speakable*). 3 next as a prompt change. 4 later, if ever, as
an optional "charlatan's voice" mode.

## 3. Phases 1 + 2 — design

### 3.1 The sentence

Every sentence has one shape:

```
[connector,] subject (action object | state) [space] [time].
```

`CONNECTION_RULES` (`rules.ts`) now says what may follow a fragment *by the role it plays*:

| Role | May be followed by |
|---|---|
| connector | subject |
| subject | action, state |
| action | object |
| state | space, time, connector, subject |
| object | space, time, connector, subject |
| space | time, connector, subject |
| time | connector, subject |

A subject or a connector after a complete predicate opens a new sentence. Types keep their names (colours,
legend and voice modulation are unchanged), but two change meaning:

- **state** is now an intransitive predicate that closes the sentence on its own ("falls silent", "grows
  luminous", "keeps trembling"), not a bare adjective.
- **connector** opens a sentence and takes a comma ("and yet", "meanwhile", "later"). Subordinating words like
  "although" are out.

### 3.2 Roles: an object can come back as a subject

A fragment plays its own type as a role, except an **object** that does not follow an action: that is a noun
come back as the subject of a new sentence. Roles are derived from the sequence of types alone
(`rolesOf` in `grammar.ts`), so nothing new is stored and the oracle's replay rebuilds them from the trace.

For that to work, object nodes get a second family of links: 3 to `space | time | connector | subject` (as an
object) and 3 to `action | state` (as a subject). `validateGraph` checks at least 3 links per role a node can play.

`buildGraph` spreads each node's links over the types its role allows (one pool per type, taken in turn), so
every node offers both ways on (an object to a place) and ways to end the sentence (to a new subject). Without
it, sentences averaged 2.8 fragments and places and times were rare.

### 3.3 The walker

- Only links whose target fits the current role are candidates. If none fits (an old or hand-made graph), any
  link will do: the grammar bends rather than the walk dying.
- **Echoes.** Whenever the next fragment may open a sentence, the walker is also offered, without a link and
  without the history penalty, the subject (the same character goes on, weight 0.35) and the object (what the
  sentence acted on becomes what the next one is about, weight 0.7) of the sentence just said; a link weighs 1.
  Only the last sentence counts: with older nouns too, one subject took over whole stories. Echoes show up in
  "Show the dice" like any other option.
- The history penalty stays for links, so the walk still explores.

### 3.4 Saying it

`phrase()` (`grammar.ts`) turns the story into text:

- A noun said a second time takes "the" ("a prism" → "the prism").
- A sentence starts with a capital; the fragment before it gets a full stop; a connector gets a comma.
- The story panel, the cinematic overlay, the voice and the oracle's answer all use it.
- The voice takes a longer breath before a new sentence.
- The oracle's answer ends only on a role that can close a sentence (roles, not types: an object that came back
  as a subject cannot end it).

### 3.5 Vocabulary

- Seed vocabulary (`builder.ts`) rewritten for the new grammar (states as predicates, times and connectors that
  fit their slot); `graph.seed.json` regenerated.
- AI prompt rewritten around the sentence shape, asking for singular subjects/objects with articles, third person
  singular verbs, and concrete images over abstractions. `PROMPT_VERSION` → `v2`: vocabularies cached with `v1`
  are no longer served (a theme picked from the suggestions is generated again).

### 3.6 Result

Real walks over the new seed graph:

> The undefined variable isolates the vessel. The vessel grows obscure in a collapsing star. The geometric shadow
> resonates in the empty plaza at the final moment. Later, an echo of silence turns volatile.
>
> A wandering thought fades away in a room without doors at midnight. The wandering thought accelerates a thread.
> The thread flickers beneath the surface. Elsewhere, a distant memory scans a mechanism once again.

Measured over 300 walks of 60 steps: 3.4 fragments per sentence, 38% of sentences come back to a noun of the
previous one, a place in 24% of sentences and a time in 29%. Building 2,000 graphs from the smallest accepted
vocabulary (5 fragments per type) never produced an invalid graph.

Still dreamlike, but it can be followed.

### 3.7 Known limits

- Now and then a sentence repeats word for word: after a subject echo, the same predicate still has about a
  1-in-20 chance despite the history penalty.
- The dice panel lists an echo with the node's own words ("a mirror", not "the mirror").
- A manual jump (clicking a node) can break the grammar for a fragment; the walk recovers on the next step.
- Speech could not be tested headless (as in P02); the breath before a sentence is 600 ms at 1× flow.

## 4. Phase 3 — scenes (implemented)

### 4.1 Design

- **Vocabulary in scenes.** A vocabulary is now `{ scenes: [{ name, subject, action, object, state, space, time }], connector }`:
  4 scenes (`SCENE_COUNT`), each a small world inside the theme with its own characters, things, places, moods and
  moments (`SCENE_COUNTS`: 5 subjects, 8 actions, 6 objects, 6 states, 6 places, 4 times), plus 10 shared
  connectors. Every node keeps its scene (`Node.scene`); the names go in `graph.meta.scenes`.
- **Links stay home.** `buildGraph` picks each link inside the source's scene 85% of the time (`SCENE_LOYALTY`);
  the rest may bridge to any scene. A connector has no scene and gets 3 links into *every* scene, so a new
  sentence can stay where the story is.
- **The walker lingers.** A link that leaves the scene the story is in (`currentScene`, the scene of its latest
  fragment) weighs 0.25 (`SCENE_DRIFT`, applied through the walker's new `affinity` rule); echoes are unaffected.
  The dice show the result like any other weight.
- **Prompt v3** asks for the scene shape, with short scene names. `sanitizeVocabulary` dedupes across the whole
  vocabulary, keeps up to 4 scenes, drops empty ones, and wants at least 2 scenes and 5 fragments per type in
  total. `PROMPT_VERSION` → `v3`.
- **Seed** regrouped into 4 scenes: *the machine*, *the hall of mirrors*, *the drowned archive*, *the edge of the
  void* (a few new places and times to fill them).
- **Graph:** a weak force pulls each scene towards its own point on a ring around the centre, so the scenes show as
  lobes with the shared connectors in the middle. The tooltip names the scene.

### 4.2 Result

Measured over 300 walks of 80 steps on the seed: 90% of steps stay in the scene (78% before the connector links
and the drift weight), and a visit to a scene lasts 8.7 fragments, about 2.5 sentences. Thin vocabularies (down
to 2 scenes, 1 fragment per type in some scenes) never built an invalid graph in 4,000 tries.

> A sudden pattern grows luminous. Later, a faceless witness burns bright. The faceless witness reveals a trace.
> The faceless witness reflects a prism beneath the surface. Elsewhere, the geometric shadow shatters a duplicate
> again and again. The duplicate obscures the lens.

## 5. Phase 4 — narrator (proposed, low priority)

As in P01 A2: a server route streams a rewrite of each finished sentence; the raw fragments stay highlighted.
Needs a fallback to the raw text without a key or when rate-limited, and a decision on how it coexists with the
oracle's reveal.

## 6. Optional: a coherence dial

If the grammar makes the charlatan too tame, a setting could let the walker break the grammar on purpose now and
then (like the glitch), or blend the old loose rules back in.
