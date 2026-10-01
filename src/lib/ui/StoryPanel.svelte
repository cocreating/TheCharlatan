<script lang="ts">
  import { slide } from 'svelte/transition';
  import { charlatan } from '$lib/engine/store.svelte';
  import type { NodeType } from '$lib/engine/types';

  const LEGEND: NodeType[] = ['subject', 'action', 'object', 'state', 'space', 'time', 'connector'];

  let panel = $state<HTMLDivElement>();
  let show = $state(true);
  let showLegend = $state(false);

  // Keep the newest fragment in view
  $effect(() => {
    void charlatan.story.length;
    panel?.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
  });
</script>

<section class="story-wrapper" class:collapsed={!show} aria-label="Story">
  <header>
    <span class="title">STORY</span>
    <span class="count">{charlatan.history.length} words</span>
    <button type="button" class="toggle" aria-expanded={show} onclick={() => (show = !show)}>
      {show ? 'HIDE' : 'SHOW'}
    </button>
  </header>

  {#if show}
    <div class="body" transition:slide={{ duration: 250 }}>
      <div class="story-panel" bind:this={panel}>
        {#each charlatan.phrases as item, i (`${i}-${item.id}`)}
          <span class="fragment type-{item.type}">{item.display}</span>
        {/each}
        <span class="cursor" aria-hidden="true"></span>
      </div>

      <footer>
        <button type="button" class="link" aria-expanded={showLegend} onclick={() => (showLegend = !showLegend)}>
          {showLegend ? 'HIDE COLOURS' : 'WHAT DO THE COLOURS MEAN?'}
        </button>
        {#if showLegend}
          <ul class="legend" transition:slide={{ duration: 200 }}>
            {#each LEGEND as type (type)}
              <li class="type-{type}"><span class="dot"></span>{type}</li>
            {/each}
          </ul>
        {/if}
      </footer>
    </div>
  {/if}
</section>

<style>
  .story-wrapper {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: 100%;
    background: var(--surface);
    backdrop-filter: var(--panel-blur);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .story-wrapper:not(.collapsed) {
    height: min(40rem, 100%);
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.6rem 0.6rem 1rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }

  .collapsed header {
    border-bottom-color: transparent;
  }

  .title {
    color: var(--text);
    font-weight: 500;
  }

  .count {
    color: var(--text-faint);
    margin-right: auto;
  }

  .toggle {
    padding: 0.3rem 0.7rem;
    font-size: 0.7rem;
    border-color: var(--border);
    color: var(--text-dim);
  }

  .body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .story-panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.25rem;
    font-family: var(--font-story);
    font-size: 1.3rem;
    font-weight: 400;
    line-height: 1.6;
    font-optical-sizing: auto;
    color: var(--text);
  }

  /* Older lines fade out under the header as the story scrolls, instead of being cut */
  .story-panel {
    mask-image: linear-gradient(to bottom, transparent 0, #000 1.8rem);
    padding-top: 1.4rem;
  }

  .fragment {
    margin-right: 0.3em;
    display: inline-block;
    opacity: 0;
    animation: fade-in 0.8s var(--ease-out) forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
      filter: blur(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
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
    width: 0.5em;
    height: 2px;
    vertical-align: baseline;
    background: var(--text-dim);
    animation: blink 1s steps(1) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  footer {
    padding: 0.5rem 1rem 0.7rem;
    border-top: 1px solid var(--border);
    font-size: 0.7rem;
  }

  .link {
    border: none;
    padding: 0.2rem 0;
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--text-faint);
  }

  .link:hover:not(:disabled) {
    background: none;
    color: var(--text);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-style: normal;
  }

  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: currentcolor;
  }

  @media (max-width: 767px) {
    .story-panel {
      font-size: 1.1rem;
    }
  }
</style>
