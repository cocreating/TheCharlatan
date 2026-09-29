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
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none; /* Let clicks pass through to graph */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    overflow: hidden;
  }

  .kinetic-text {
    font-weight: bold;
    font-size: 5rem;
    color: rgb(255 255 255 / 90%);
    text-shadow: 0 0 20px #000;
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
    color: #ff4040;
    animation: punch-in 2s cubic-bezier(0.1, 0.7, 0.1, 1) forwards;
  }

  /* SUBJECT/OBJECT: Fade in solidly, slide up */
  @keyframes solid-fade {
    0% { transform: translateY(20px); opacity: 0; }
    20% { transform: translateY(0); opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }

  .animate-object,
  .animate-subject {
    color: #fff;
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
    color: #a0a0ff;
    font-style: italic;
    font-weight: normal;
    animation: slow-drift 4s linear forwards;
  }

  /* STATE: Blur pulsing */
  @keyframes blur-pulse {
    0% { opacity: 0; filter: blur(10px); }
    30% { opacity: 1; filter: blur(0); }
    60% { opacity: 0.8; filter: blur(2px); }
    100% { opacity: 0; filter: blur(10px); transform: scale(1.2); }
  }

  .animate-state {
    color: #ff0;
    animation: blur-pulse 2.5s ease-in-out forwards;
  }

  /* CONNECTOR: Subtle */
  .animate-connector {
    font-size: 2rem;
    color: #888;
    animation: solid-fade 1s ease-out forwards;
  }
</style>
