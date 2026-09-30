<script lang="ts">
  import { untrack } from 'svelte';
  import { charlatan } from '$lib/engine/store.svelte';
  import { oracle } from '$lib/oracle/oracle.svelte';
  import { revealLines } from '$lib/oracle/answer';

  const MAX_QUESTION_LENGTH = 500;
  const MAX_LISTED = 6;

  let question = $state('');
  let forget = $state(false);

  // The walk has spoken its last word: hand over to "Did it speak to you?"
  $effect(() => {
    if (oracle.phase === 'answering' && charlatan.answerDone && !charlatan.isPlaying) {
      untrack(oracle.finishAnswer);
    }
  });

  const roll = $derived(oracle.phase === 'replaying' ? (charlatan.dice?.step ?? null) : null);
  const options = $derived(
    (roll?.candidates ?? []).map(c => {
      const node = charlatan.nodesById.get(c.id);
      return { ...c, text: node?.text ?? c.id, type: node?.type ?? 'connector', chosen: c.id === roll?.node };
    }),
  );
  const ranked = $derived([...options].sort((a, b) => b.p - a.p));
  // The most likely options, always including the one that came out (unlikely picks are the point)
  const shown = $derived.by(() => {
    const top = ranked.slice(0, MAX_LISTED);
    const chosen = ranked.find(o => o.chosen);
    return chosen && !top.includes(chosen) ? [...top.slice(0, MAX_LISTED - 1), chosen] : top;
  });

  function ask(e: SubmitEvent) {
    e.preventDefault();
    oracle.ask(question, !forget);
  }

  function onQuestionKeydown(e: KeyboardEvent) {
    // Enter asks, Shift+Enter breaks the line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      oracle.ask(question, !forget);
    }
  }

  function askAgain() {
    oracle.close();
    question = '';
  }

  const pct = (p: number) => `${Math.round(p * 100)}%`;
</script>

<section class="oracle" aria-live="polite">
  {#if oracle.phase === 'idle'}
    <form onsubmit={ask}>
      <label for="oracle-question">ASK THE ORACLE</label>
      <textarea
        id="oracle-question"
        rows="2"
        maxlength={MAX_QUESTION_LENGTH}
        placeholder="Will I find what I am looking for?"
        bind:value={question}
        onkeydown={onQuestionKeydown}
      ></textarea>
      <p class="note">
        {forget
          ? 'Only your reaction will be kept, not your words.'
          : 'Your question is kept anonymously as part of the piece.'}
      </p>
      <div class="row">
        <label class="keep">
          <input type="checkbox" bind:checked={forget} />
          Don't keep my words
        </label>
        <button type="submit" disabled={!question.trim()}>ASK</button>
      </div>
    </form>
  {:else}
    <p class="asked">“{oracle.question}”</p>

    {#if oracle.phase === 'answering'}
      <div class="row">
        <p class="status">The oracle is answering…</p>
        <button type="button" onclick={oracle.close}>STOP</button>
      </div>
    {:else if oracle.phase === 'asking'}
      <p class="answer">{oracle.answer}</p>
      <p class="prompt">Did it speak to you?</p>
      <div class="row choices">
        <button type="button" onclick={() => oracle.respond(true)}>YES</button>
        <button type="button" onclick={() => oracle.respond(false)}>NO</button>
      </div>
    {:else if oracle.phase === 'replaying'}
      <p class="prompt">Now, the dice.</p>
      {#if roll}
        <p class="status">
          Word {oracle.rollIndex + 1} of {charlatan.trace.length} · {options.length}
          {options.length === 1 ? 'option' : 'options'}
        </p>
        <div class="strip" aria-hidden="true">
          {#each options as o (o.id)}
            <span class="segment" class:chosen={o.chosen} style:width={pct(o.p)} style:background="var(--c-{o.type})"
            ></span>
          {/each}
          <span class="marker" style:left="{roll.roll * 100}%"></span>
        </div>
        <ol class="options">
          {#each shown as o (o.id)}
            <li class:chosen={o.chosen}>
              <span class="p">{pct(o.p)}</span>
              <span class="text type-{o.type}">{o.text}</span>
            </li>
          {/each}
          {#if ranked.length > shown.length}
            <li class="more">…and {ranked.length - shown.length} more</li>
          {/if}
        </ol>
        <p class="status">The dice rolled {roll.roll.toFixed(2)}.</p>
      {/if}
      <button type="button" class="link" onclick={oracle.skip}>SKIP</button>
    {:else if oracle.phase === 'revealed'}
      {#each revealLines(oracle.felt, oracle.stats) as line, i (i)}
        <p class="reveal">{line}</p>
      {/each}
      <button type="button" onclick={askAgain}>ASK AGAIN</button>
    {/if}
  {/if}
</section>

<style>
  .oracle {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.8rem;
    background: rgb(0 0 0 / 30%);
    backdrop-filter: blur(5px);
    border: 1px solid #333;
    font-size: 0.7rem;
    color: #888;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  p {
    margin: 0;
  }

  textarea {
    resize: vertical;
    min-height: 2.6rem;
    padding: 0.5rem;
    background: #000;
    border: 1px solid #333;
    color: var(--text);
    font-family: inherit;
    font-size: 0.8rem;
  }

  textarea:focus {
    outline: none;
    border-color: #777;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .choices {
    justify-content: flex-start;
  }

  .keep {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }

  .note {
    font-size: 0.65rem;
    color: #666;
  }

  button {
    min-width: 0;
    padding: 0.5rem 0.8rem;
    font-size: 0.7rem;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .link {
    align-self: flex-end;
    border: none;
    padding: 0;
    color: #888;
    text-decoration: underline;
  }

  .link:hover {
    background: none;
    color: #fff;
  }

  .asked {
    color: var(--text);
    font-style: italic;
    font-size: 0.8rem;
  }

  .answer {
    color: var(--c-state);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .prompt {
    color: #fff;
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }

  .reveal {
    color: var(--text);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .strip {
    position: relative;
    display: flex;
    height: 0.8rem;
    border: 1px solid #333;
    overflow: visible;
  }

  .segment {
    height: 100%;
    opacity: 0.25;
    border-right: 1px solid #000;
  }

  .segment.chosen {
    opacity: 1;
  }

  .marker {
    position: absolute;
    top: -0.3rem;
    bottom: -0.3rem;
    width: 2px;
    margin-left: -1px;
    background: #fff;
  }

  .options {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .options li {
    display: flex;
    gap: 0.6rem;
    opacity: 0.45;
  }

  .options li.chosen {
    opacity: 1;
  }

  .options li.chosen .text::after {
    content: '  ←';
    color: #fff;
  }

  .options .p {
    min-width: 2.5rem;
    text-align: right;
    color: #aaa;
  }

  .more {
    padding-left: 3.1rem;
  }

  .type-subject { color: var(--c-subject); }
  .type-action { color: var(--c-action); }
  .type-space { color: var(--c-space); }
  .type-time { color: var(--c-time); }
  .type-state { color: var(--c-state); }
  .type-object { color: var(--c-object); }
  .type-connector { color: var(--c-connector); font-style: italic; }
</style>
