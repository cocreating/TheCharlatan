<script lang="ts">
  import { charlatan } from '$lib/engine/store.svelte';

  let show = $state(true);

  const shortVoiceName = (name: string) =>
    name.replace('Google', '').replace('English', '').trim().substring(0, 10);
</script>

<div class="controls-container" class:hidden={!show}>
  <button type="button" class="controls-toggle" onclick={() => (show = !show)}>
    {show ? '▼' : '▲'} CONTROLS
  </button>

  <div class="controls-content">
    <div id="controls-buttons" class="controls-wrapper">
      <!-- The label reflects the current state: PLAY (lit) while the story runs. -->
      <button type="button" class="btn-play" class:active={charlatan.isPlaying} onclick={charlatan.togglePlay} disabled={charlatan.mode === 'frozen'}>
        {charlatan.isPlaying ? 'PLAY' : 'PAUSE'}
      </button>
      <button type="button" class="btn-reset" onclick={charlatan.reset} disabled={charlatan.mode !== 'free'}>RESET</button>
    </div>

    <div id="controls-options" class="controls-wrapper">
      <div class="speed-control">
        <label class="toggle-label">
          <input type="checkbox" bind:checked={charlatan.ttsEnabled} />
          AUDIO
        </label>

        {#if charlatan.ttsEnabled && charlatan.availableVoices.length > 0}
          <select class="voice-select" bind:value={charlatan.voiceName}>
            {#each charlatan.availableVoices as voice (voice)}
              <option value={voice}>{shortVoiceName(voice)}</option>
            {/each}
          </select>
        {/if}

        <label class="toggle-label glitch" class:on={charlatan.glitchEnabled}>
          <input type="checkbox" bind:checked={charlatan.glitchEnabled} />
          GLITCH
        </label>
      </div>
    </div>

    <div id="controls-sliders" class="controls-wrapper">
      <div class="sliders">
        <div class="slider">
          <label for="flow-speed">Flow Speed {charlatan.transitionSpeed.toFixed(1)}x</label>
          <input id="flow-speed" type="range" min="0.5" max="3.0" step="0.1" bind:value={charlatan.transitionSpeed} />
        </div>
        <div class="slider">
          <label for="voice-speed">Voice Speed {charlatan.voiceSpeed.toFixed(1)}x</label>
          <input id="voice-speed" type="range" min="0.5" max="3.0" step="0.1" bind:value={charlatan.voiceSpeed} />
        </div>
      </div>
    </div>

    <span class="status">SEQ: {charlatan.history.length}</span>
  </div>
</div>

<style>
  .controls-container {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 100px;
    background: #000;
    border-top: 1px solid #333;
    display: flex;
    justify-content: center;
    z-index: 50;
    transition: transform 0.3s cubic-bezier(0.1, 0.7, 0.1, 1);
  }

  .controls-container.hidden {
    transform: translateY(100%);
  }

  .controls-content {
    width: 100%;
    max-width: 1200px;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .controls-toggle {
    position: absolute;
    top: -30px;
    right: 20px;
    min-width: 0;
    background: #000;
    border: 1px solid #333;
    border-bottom: none;
    padding: 5px 15px;
    font-size: 0.7rem;
    letter-spacing: normal;
    color: #888;
    border-radius: 5px 5px 0 0;
  }

  .controls-toggle:hover {
    background: #000;
    border-color: #333;
    color: #fff;
  }

  .controls-wrapper {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .btn-play.active {
    background: var(--c-state);
    color: #000;
    border-color: #fff;
    box-shadow: 0 0 10px rgb(29 209 161 / 40%);
  }

  .btn-reset:active {
    background: var(--c-action);
    transform: translateY(2px) scale(0.95);
    border-color: #fff;
    color: #000;
  }

  .speed-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    margin-left: auto;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 1rem;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .glitch {
    color: #aaa;
  }

  .glitch.on {
    color: #ff3333;
  }

  .voice-select {
    max-width: 100px;
    background: #111;
    color: #aaa;
    border: 1px solid #333;
    font-size: 0.7rem;
  }

  .sliders {
    display: flex;
    gap: 1rem;
  }

  .slider {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .status {
    font-size: 0.7rem;
    color: #555;
    width: 100%;
    text-align: right;
    margin-top: 0.5rem;
  }

  @media (max-width: 768px) {
    .controls-container {
      height: 200px;
      flex-direction: column;
    }

    .controls-content {
      flex-direction: column;
      width: auto;
    }
  }
</style>
