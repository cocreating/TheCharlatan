<script lang="ts">
  import { fade } from 'svelte/transition';
  import { charlatan } from '$lib/engine/store.svelte';

  let open = $state(true);
  let dialog = $state<HTMLDialogElement>();

  // Modal: the page behind is inert and focus starts on the first button
  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal();
  });

  // The click is the user gesture browsers need before speech and Web Audio may start.
  function begin(withSound: boolean) {
    charlatan.ttsEnabled = withSound;
    if (!charlatan.isPlaying) charlatan.togglePlay();
    open = false;
  }

  // Escape starts the piece quietly instead of leaving a blank dialog
  function onCancel(e: Event) {
    e.preventDefault();
    begin(false);
  }
</script>

{#if open}
  <dialog class="intro" aria-labelledby="intro-title" bind:this={dialog} oncancel={onCancel} out:fade={{ duration: 700 }}>
    <div class="content">
      <p class="kicker">a generative storyteller</p>
      <h1 id="intro-title">The Charlatan</h1>
      <p class="lede">
        A walker wanders a web of words. Every step is a roll of the dice, every sentence a small, confident lie.
      </p>
      <div class="actions">
        <button type="button" class="primary" onclick={() => begin(true)}>BEGIN WITH SOUND</button>
        <button type="button" onclick={() => begin(false)}>BEGIN IN SILENCE</button>
      </div>
      <p class="hint">Give it a theme, or ask the oracle a question.</p>
    </div>
  </dialog>
{/if}

<style>
  .intro {
    position: fixed;
    inset: 0;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    border: none;
    color: var(--text);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: radial-gradient(ellipse at center, rgb(21 20 28 / 45%), rgb(7 7 10 / 88%) 75%);
    backdrop-filter: blur(6px);
  }

  .intro::backdrop {
    background: transparent;
  }

  .content {
    max-width: 44rem;
    text-align: center;
    animation: rise 1.4s var(--ease-out) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
      filter: blur(6px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: none;
    }
  }

  .kicker {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  h1 {
    margin: 0.6rem 0 1.2rem;
    font-family: var(--font-story);
    font-size: clamp(3rem, 11vw, 6rem);
    font-weight: 600;
    font-style: italic;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--text);
    text-shadow: 0 0 40px rgb(61 219 176 / 25%);
  }

  .lede {
    margin: 0 auto 2rem;
    max-width: 28rem;
    font-family: var(--font-story);
    font-size: 1.2rem;
    line-height: 1.55;
    color: var(--text-dim);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .actions button {
    min-width: 12rem;
  }

  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #04140f;
    box-shadow: 0 0 18px rgb(61 219 176 / 35%);
  }

  .primary:hover:not(:disabled) {
    background: var(--c-subject);
    border-color: var(--c-subject);
  }

  .hint {
    margin: 1.75rem 0 0;
    font-size: 0.75rem;
    color: var(--text-faint);
  }
</style>
