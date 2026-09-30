# A20 - Narrative Engine Spec

## Sentences
The walker speaks in sentences (P03). Every sentence has one shape:

```
[connector,] subject (action object | state) [space] [time].
```

`CONNECTION_RULES` (`src/lib/engine/rules.ts`) says what may follow each **role**. A fragment's role is its
type, except an object that does not follow an action: that is a noun come back as the subject of a new
sentence. Roles are derived from the sequence of types (`rolesOf` in `grammar.ts`), never stored.

## Walker Logic
A **weighted random walk** with **history penalization**, filtered by the grammar.

### Algorithm
1. Identify the current node and the role it plays.
2. Take its outgoing links whose target type fits that role. If none fits (an old or hand-made graph), take them all.
3. Weight each candidate:
   - Base weight: the link's `weight` (1 by default)
   - Penalty: `weight * (0.1 ^ recent_visits_in_last_20_steps)`
4. If the next fragment may open a sentence, add the **echoes**: the object (weight 0.7) and the subject
   (weight 0.35) of the sentence just said, without a link and without the penalty. A node offered twice
   adds up its weights.
5. Normalize and roll (`rollAmong`). The roll and every candidate are recorded for "Show the dice".

## Saying it
`phrase()` (`grammar.ts`) turns the story into text: "the" on a second mention of a noun, a capital at the start
of a sentence, a full stop before the next one, a comma after a connector. The voice takes a longer breath
before a new sentence (`loop.ts`). An oracle answer ends only on a role that can close a sentence.

## State Management
`CharlatanState` (`src/lib/engine/store.svelte.ts`, Svelte 5 runes).
- `activeNodeId`: Current focal point.
- `history`: Array of visited IDs.
- `story`: Array of accumulated fragments; `phrases` is the same story as said and written.
