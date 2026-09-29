<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';
  import { requestThemedGraph } from '$lib/ai/vocabulary';

  let theme = $state('');
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);

  async function summon(e: SubmitEvent) {
    e.preventDefault();
    const requested = theme.trim();
    if (!requested || loading) return;

    loading = true;
    errorMessage = null;
    try {
      charlatan.loadGraph(await requestThemedGraph(requested), requested);
      theme = '';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }
</script>

<form class="theme-prompt" onsubmit={summon}>
  <label for="theme-input">THEME</label>
  <div class="row">
    <input
      id="theme-input"
      type="text"
      maxlength="200"
      placeholder="noir rain over a harbour city"
      autocomplete="off"
      bind:value={theme}
      disabled={loading}
    />
    <button type="submit" disabled={loading || !theme.trim()}>
      {loading ? 'CONJURING…' : 'SUMMON'}
    </button>
  </div>

  {#if errorMessage}
    <p class="error" role="alert">{errorMessage}</p>
  {:else if charlatan.theme}
    <p class="current">
      <span class="current-theme">“{charlatan.theme}”</span>
      <button type="button" class="link" onclick={charlatan.restoreSeed}>ORIGINAL</button>
    </p>
  {/if}
</form>

<style>
  .theme-prompt {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 45;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: min(360px, calc(100vw - 3rem));
    padding: 0.8rem;
    background: rgb(0 0 0 / 30%);
    backdrop-filter: blur(5px);
    border: 1px solid #333;
    font-size: 0.7rem;
    color: #888;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0.5rem;
    background: #000;
    border: 1px solid #333;
    color: var(--text);
    font-family: inherit;
    font-size: 0.8rem;
  }

  input:focus {
    outline: none;
    border-color: #777;
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

  p {
    margin: 0;
  }

  .error {
    color: var(--c-action);
  }

  .current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    color: var(--c-state);
  }

  .current-theme {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link {
    border: none;
    padding: 0;
    color: #888;
    text-decoration: underline;
  }

  .link:hover {
    background: none;
    color: #fff;
  }
</style>
