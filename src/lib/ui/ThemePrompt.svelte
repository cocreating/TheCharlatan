<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';
  import { requestThemedGraph, fetchThemeSuggestions, type ThemeSuggestion } from '$lib/ai/vocabulary';
  import { MIN_SUGGEST_QUERY, normalizeTheme } from '$lib/themes';

  const SUGGEST_DEBOUNCE_MS = 250;

  let theme = $state('');
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);

  // Autocomplete from themes already stored (loading one costs no AI call)
  let suggestions = $state.raw<ThemeSuggestion[]>([]);
  let open = $state(false);
  let active = $state(-1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;

  const locked = $derived(charlatan.mode !== 'free');
  const listOpen = $derived(open && suggestions.length > 0 && !loading);

  $effect(() => () => {
    clearTimeout(timer);
    controller?.abort();
  });

  function closeList() {
    open = false;
    active = -1;
  }

  function onInput() {
    errorMessage = null;
    clearTimeout(timer);
    controller?.abort();
    const typed = theme;
    if (normalizeTheme(typed).length < MIN_SUGGEST_QUERY) {
      suggestions = [];
      closeList();
      return;
    }
    timer = setTimeout(async () => {
      controller = new AbortController();
      const found = await fetchThemeSuggestions(typed, controller.signal);
      if (typed !== theme) return; // The visitor kept typing
      suggestions = found;
      active = -1;
      open = found.length > 0;
    }, SUGGEST_DEBOUNCE_MS);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      open = true;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + suggestions.length) % suggestions.length;
    } else if (e.key === 'Enter' && listOpen && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape' && listOpen) {
      e.preventDefault();
      closeList();
    }
  }

  function choose(s: ThemeSuggestion) {
    theme = s.theme;
    closeList();
    summonTheme(s.theme, true);
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    closeList();
    summonTheme(theme.trim(), false);
  }

  async function summonTheme(requested: string, cachedOnly: boolean) {
    if (!requested || loading || locked) return;
    clearTimeout(timer);
    loading = true;
    errorMessage = null;
    try {
      const { graph, vocabularyId } = await requestThemedGraph(requested, cachedOnly);
      charlatan.loadGraph(graph, requested, vocabularyId);
      theme = '';
      suggestions = [];
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }
</script>

<form class="theme-prompt" onsubmit={onSubmit}>
  <label for="theme-input">THEME</label>
  <div class="row">
    <div class="field">
      <input
        id="theme-input"
        type="text"
        maxlength="200"
        placeholder="noir rain over a harbour city"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="theme-suggestions"
        aria-expanded={listOpen}
        aria-activedescendant={listOpen && active >= 0 ? `theme-option-${active}` : undefined}
        bind:value={theme}
        oninput={onInput}
        onkeydown={onKeydown}
        onblur={closeList}
        disabled={loading || locked}
      />
      <ul id="theme-suggestions" role="listbox" aria-label="Themes already summoned" hidden={!listOpen}>
        {#each suggestions as s, i (s.key)}
          <!-- Keyboard lives on the input (combobox + aria-activedescendant); the click is for pointers. -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <li
            id="theme-option-{i}"
            role="option"
            aria-selected={i === active}
            class:active={i === active}
            onpointerdown={e => e.preventDefault()}
            onclick={() => choose(s)}
          >
            {s.theme}
          </li>
        {/each}
      </ul>
    </div>
    <button type="submit" disabled={loading || locked || !theme.trim()}>
      {loading ? 'CONJURING…' : 'SUMMON'}
    </button>
  </div>

  {#if errorMessage}
    <p class="error" role="alert">{errorMessage}</p>
  {:else if charlatan.theme}
    <p class="current">
      <span class="current-theme">“{charlatan.theme}”</span>
      <button type="button" class="link" onclick={charlatan.restoreSeed} disabled={locked}>ORIGINAL</button>
    </p>
  {/if}
</form>

<style>
  .theme-prompt {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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

  .field {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
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

  ul {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 5;
    margin: 0;
    padding: 0;
    list-style: none;
    background: #000;
    border: 1px solid #555;
    border-top: none;
    max-height: 14rem;
    overflow-y: auto;
  }

  ul[hidden] {
    display: none;
  }

  li {
    padding: 0.45rem 0.5rem;
    font-size: 0.8rem;
    color: var(--text);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  li:hover,
  li.active {
    background: #222;
    color: var(--c-state);
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
