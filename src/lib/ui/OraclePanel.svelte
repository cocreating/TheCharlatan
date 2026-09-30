<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { charlatan } from '$lib/engine/store.svelte';
  import { oracle } from '$lib/oracle/oracle.svelte';
  import { revealLines } from '$lib/oracle/answer';

  const MAX_QUESTION_LENGTH = 500;
  const MAX_LISTED = 6;

  let question = $state('');
  let forget = $state(false);
  // Narrow screens only (CSS): the idle form starts folded so the graph stays visible
  let folded = $state(true);
  let textarea = $state<HTMLTextAreaElement>();

  function toggleFold() {
    folded = !folded;
    if (!folded) tick().then(() => textarea?.focus());
  }

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
    <button type="button" class="fold" aria-expanded={!folded} aria-controls="oracle-form" onclick={toggleFold}>
      ASK THE ORACLE <span class="chevron" aria-hidden="true">▾</span>
    </button>
    <form id="oracle-form" class:folded onsubmit={ask}>
      <label for="oracle-question">ASK THE ORACLE</label>
      <textarea
        bind:this={textarea}
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
  /* Panel heading */
  label[for] {
    color: var(--text);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.1em;
  }

  /* The fold toggle replaces the label on narrow screens only */
  .fold {
    display: none;
  }

  @media (max-width: 767px) {
    .fold {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0;
      border: none;
      color: var(--text);
      font-size: 0.75rem;
      letter-spacing: 0.1em;
    }

    .fold:hover:not(:disabled) {
      background: none;
    }

    .chevron {
      font-size: 0.9rem;
      color: var(--text-dim);
      transition: transform 0.25s var(--ease-out);
    }

    .fold[aria-expanded='true'] .chevron {
      transform: rotate(180deg);
    }

    form label[for] {
      display: none;
    }

    form.folded {
      display: none;
    }
  }

  .oracle {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.9rem 1rem;
    background: var(--surface);
    backdrop-filter: var(--panel-blur);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--text-dim);
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
    background: rgb(0 0 0 / 45%);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    color: var(--text);
    font-family: inherit;
    font-size: 0.9rem;
  }

  textarea:focus {
    border-color: var(--text-faint);
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
    accent-color: var(--accent);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
  }

  .note {
    font-size: 0.72rem;
    color: var(--text-faint);
  }

  button {
    padding: 0.5rem 0.9rem;
    font-size: 0.75rem;
  }

  .link {
    align-self: flex-end;
    border: none;
    padding: 0;
    color: var(--text-faint);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .link:hover:not(:disabled) {
    background: none;
    color: var(--text);
  }

  .asked {
    color: var(--text);
    font-family: var(--font-story);
    font-style: italic;
    font-size: 1.05rem;
  }

  .answer {
    color: var(--c-state);
    font-family: var(--font-story);
    font-size: 1.15rem;
    line-height: 1.5;
  }

  .prompt {
    color: var(--text);
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }

  .reveal {
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .strip {
    position: relative;
    display: flex;
    height: 0.8rem;
    border: 1px solid var(--border-strong);
    border-radius: 2px;
    overflow: visible;
  }

  .segment {
    height: 100%;
    opacity: 0.3;
    border-right: 1px solid var(--bg);
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
    background: var(--text);
    box-shadow: 0 0 6px var(--text);
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
    opacity: 0.6;
  }

  .options li.chosen {
    opacity: 1;
  }

  .options li.chosen .text::after {
    content: '  ←';
    color: var(--text);
  }

  .options .p {
    min-width: 2.5rem;
    text-align: right;
    color: var(--text-dim);
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
