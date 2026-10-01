<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';

  let show = $state(true);

  const shortVoiceName = (name: string) =>
    name.replace('Google', '').replace('English', '').trim().substring(0, 14);
</script>

<div class="controls-container" class:hidden={!show}>
  <button type="button" class="controls-toggle" aria-expanded={show} onclick={() => (show = !show)}>
    {show ? '▾' : '▴'} CONTROLS
  </button>

  <div class="controls-clip">
    <div class="controls-content">
      <span class="status">SEQ {charlatan.history.length}</span>

      <div class="sliders">
        <div class="slider">
          <label for="flow-speed">Flow <output for="flow-speed">{charlatan.transitionSpeed.toFixed(1)}×</output></label>
          <input id="flow-speed" type="range" min="0.5" max="3.0" step="0.1" bind:value={charlatan.transitionSpeed} />
        </div>
        <div class="slider">
          <label for="voice-speed">Voice <output for="voice-speed">{charlatan.voiceSpeed.toFixed(1)}×</output></label>
          <input id="voice-speed" type="range" min="0.5" max="3.0" step="0.1" bind:value={charlatan.voiceSpeed} />
        </div>
      </div>

      <div class="group">
        {#if charlatan.ttsEnabled && charlatan.availableVoices.length > 0}
          <select class="voice-select" aria-label="Voice" bind:value={charlatan.voiceName}>
            {#each charlatan.availableVoices as voice (voice)}
              <option value={voice}>{shortVoiceName(voice)}</option>
            {/each}
          </select>
        {/if}
        <button
          type="button"
          class="btn-toggle btn-audio"
          class:active={charlatan.ttsEnabled}
          aria-pressed={charlatan.ttsEnabled}
          onclick={() => (charlatan.ttsEnabled = !charlatan.ttsEnabled)}
        >
          AUDIO
        </button>
        <button
          type="button"
          class="btn-toggle btn-glitch"
          class:active={charlatan.glitchEnabled}
          aria-pressed={charlatan.glitchEnabled}
          onclick={() => (charlatan.glitchEnabled = !charlatan.glitchEnabled)}
        >
          GLITCH
        </button>
      </div>

      <div class="group">
        <button type="button" class="btn-reset" onclick={charlatan.reset} disabled={charlatan.mode !== 'free'}>RESET</button>
        <!-- The label is the state, worded so it can't be read as an action: PLAYING (lit) or PAUSED. -->
        <button
          type="button"
          class="btn-play"
          class:active={charlatan.isPlaying}
          aria-label={charlatan.isPlaying ? 'Playing. Pause' : 'Paused. Play'}
          onclick={charlatan.togglePlay}
          disabled={charlatan.mode === 'frozen'}
        >
          {charlatan.isPlaying ? '▶ PLAYING' : '❚❚ PAUSED'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .controls-container {
    position: relative;
    z-index: 50;
    display: grid;
    grid-template-rows: 1fr;
    background: var(--surface-solid);
    border-top: 1px solid var(--border);
    transition: grid-template-rows 0.35s var(--ease-out);
  }

  /* Collapses to zero height; the tab stays visible above the edge */
  .controls-container.hidden {
    grid-template-rows: 0fr;
  }

  .controls-clip {
    min-height: 0;
    overflow: hidden;
  }

  .controls-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem 1.5rem;
    padding: 0.8rem 1.25rem;
  }

  .controls-toggle {
    position: absolute;
    bottom: 100%;
    right: 1.25rem;
    padding: 0.3rem 0.8rem;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    background: var(--surface-solid);
    border-color: var(--border);
    border-bottom: none;
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .controls-toggle:hover:not(:disabled) {
    background: var(--surface-solid);
    color: var(--text);
  }

  .group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .group button {
    min-width: 7.5rem;
  }

  .btn-toggle {
    color: var(--text-dim);
  }

  .btn-play.active {
    background: var(--accent);
    color: #04140f;
    border-color: var(--accent);
    box-shadow: 0 0 14px rgb(61 219 176 / 40%);
  }

  .btn-audio.active {
    color: var(--accent);
    border-color: var(--accent);
    background: rgb(61 219 176 / 10%);
  }

  .btn-glitch.active {
    color: var(--danger);
    border-color: var(--danger);
    background: rgb(255 107 107 / 10%);
    text-shadow:
      1px 0 rgb(0 255 255 / 60%),
      -1px 0 rgb(255 0 80 / 60%);
  }

  .btn-reset:active:not(:disabled) {
    background: var(--danger);
    border-color: var(--danger);
    color: #000;
    transform: translateY(1px) scale(0.97);
  }

  .voice-select {
    max-width: 10rem;
    padding: 0.5rem;
    background: var(--surface-hover);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    font-size: 0.75rem;
  }

  .sliders {
    display: flex;
    gap: 1.25rem;
  }

  .slider {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.75rem;
    color: var(--text-dim);
  }

  .slider output {
    color: var(--text);
  }

  .slider input {
    width: 8rem;
    accent-color: var(--accent);
  }

  .status {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--text-faint);
  }

  @media (max-width: 767px) {
    .controls-content {
      gap: 0.6rem 0.8rem;
      padding: 0.7rem 0.75rem;
    }

    .controls-toggle {
      right: 0.75rem;
    }

    .group button {
      min-width: 0;
      padding: 0.5rem 0.75rem;
    }

    .status {
      display: none;
    }
  }
</style>
