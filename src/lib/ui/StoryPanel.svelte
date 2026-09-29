<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';

  let panel = $state<HTMLDivElement>();
  let show = $state(true);

  // Keep the newest fragment in view
  $effect(() => {
    void charlatan.story.length;
    panel?.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
  });
</script>

<div class="story-wrapper" class:hidden={!show}>
  <button type="button" class="story-toggle" onclick={() => (show = !show)}>
    {show ? 'HIDE TEXT' : 'SHOW TEXT'}
  </button>
  {#if show}
    <div class="story-panel" bind:this={panel}>
      {#each charlatan.story as item, i (`${i}-${item.id}`)}
        <span class="fragment type-{item.type}">{item.text}</span>
      {/each}
      <span class="cursor">_</span>
    </div>
  {/if}
</div>

<style>
  .story-wrapper {
    pointer-events: auto;
    background: rgb(0 0 0 / 30%);
    backdrop-filter: blur(5px);
    border: 1px solid #333;
    padding: 1rem;
    max-width: 350px;
    height: 600px;
    display: flex;
    flex-direction: column;
    transition:
      background 0.3s,
      border 0.3s,
      height 0.3s;
  }

  .story-wrapper.hidden {
    background: transparent;
    border-color: transparent;
    backdrop-filter: none;
    height: 0;
    padding: 0 1rem;
  }

  .story-toggle {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 0;
    background: rgb(0 0 0 / 80%);
    border: none;
    color: #aaa;
    padding: 5px 10px;
    font-size: 0.7rem;
    letter-spacing: normal;
    transition: color 0.2s;
  }

  .story-toggle:hover {
    background: rgb(0 0 0 / 80%);
    color: #fff;
  }

  .story-panel {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 2rem;
    line-height: 1.8;
    font-size: 1.1rem;
    padding-right: 1rem;
  }

  .story-panel::-webkit-scrollbar {
    width: 6px;
  }

  .story-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .story-panel::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
  }

  .fragment {
    margin-right: 0.4em;
    display: inline-block;
    opacity: 0;
    animation: fade-in 0.8s ease forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .type-subject { color: var(--c-subject); }
  .type-action { color: var(--c-action); }
  .type-space { color: var(--c-space); }
  .type-time { color: var(--c-time); }
  .type-state { color: var(--c-state); }
  .type-object { color: var(--c-object); }
  .type-connector { color: var(--c-connector); font-style: italic; }

  .cursor {
    display: inline-block;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
