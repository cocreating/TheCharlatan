<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';
</script>

{#if charlatan.activeNode}
  {@const node = charlatan.activeNode}
  <div class="overlay-container">
    {#key node.id}
      <div class="kinetic-text animate-{node.type}">{node.text}</div>
    {/key}
  </div>
{/if}

<style>
  .overlay-container {
    position: absolute;
    inset: 0;
    pointer-events: none; /* Let clicks pass through to graph */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    overflow: hidden;
  }

  .kinetic-text {
    font-family: var(--font-story);
    font-weight: 600;
    font-size: clamp(2.75rem, 9vw, 6.5rem);
    line-height: 1.05;
    letter-spacing: -0.01em;
    color: var(--c-subject);
    text-shadow:
      0 0 30px rgb(0 0 0 / 90%),
      0 0 60px currentcolor;
    text-align: center;
    max-width: 80%;
    opacity: 0; /* Each type animates its own entrance/exit */
  }

  /* ACTION: Punch in fast, scale down */
  @keyframes punch-in {
    0% { transform: scale(3); opacity: 0; filter: contrast(2); }
    20% { transform: scale(1); opacity: 1; filter: contrast(1); }
    80% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0; }
  }

  .animate-action {
    color: var(--c-action);
    animation: punch-in 2s cubic-bezier(0.1, 0.7, 0.1, 1) forwards;
  }

  /* SUBJECT/OBJECT: Fade in solidly, slide up */
  @keyframes solid-fade {
    0% { transform: translateY(20px); opacity: 0; }
    20% { transform: translateY(0); opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }

  .animate-subject {
    color: var(--c-subject);
    animation: solid-fade 3s ease-out forwards;
  }

  .animate-object {
    color: var(--c-object);
    animation: solid-fade 3s ease-out forwards;
  }

  /* TIME/SPACE: Slow drift, deep blur */
  @keyframes slow-drift {
    0% { transform: scale(0.9) translateX(-10px); opacity: 0; filter: blur(4px); }
    30% { transform: scale(1) translateX(0); opacity: 0.8; filter: blur(0); }
    90% { transform: scale(1.1) translateX(10px); opacity: 0; filter: blur(2px); }
  }

  .animate-time,
  .animate-space {
    font-style: italic;
    font-weight: 300;
    animation: slow-drift 4s linear forwards;
  }

  .animate-time { color: var(--c-time); }
  .animate-space { color: var(--c-space); }

  /* STATE: Blur pulsing */
  @keyframes blur-pulse {
    0% { opacity: 0; filter: blur(10px); }
    30% { opacity: 1; filter: blur(0); }
    60% { opacity: 0.8; filter: blur(2px); }
    100% { opacity: 0; filter: blur(10px); transform: scale(1.2); }
  }

  .animate-state {
    color: var(--c-state);
    animation: blur-pulse 2.5s ease-in-out forwards;
  }

  /* CONNECTOR: Subtle */
  .animate-connector {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    font-style: italic;
    font-weight: 300;
    color: var(--c-connector);
    animation: solid-fade 1s ease-out forwards;
  }

  /* No motion: the word simply appears, dimmed */
  @media (prefers-reduced-motion: reduce) {
    .kinetic-text {
      animation: none !important;
      opacity: 0.7;
      filter: none;
    }
  }
</style>
