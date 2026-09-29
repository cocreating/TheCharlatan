<script lang="ts">
  import { untrack } from 'svelte';
  import { charlatan } from '$lib/engine/store.svelte';
  import { startLoop } from '$lib/engine/loop';
  import { getEnglishVoices, cancelSpeech } from '$lib/engine/audio';
  import { ambient } from '$lib/engine/ambient';
  import ForceGraph from '$lib/viz/ForceGraph.svelte';
  import StoryPanel from '$lib/ui/StoryPanel.svelte';
  import Controls from '$lib/ui/Controls.svelte';
  import CinematicOverlay from '$lib/ui/CinematicOverlay.svelte';
  import ThemePrompt from '$lib/ui/ThemePrompt.svelte';

  const PREFERRED_VOICE = 'Google UK English Female';

  // Load voices (the list arrives asynchronously in most browsers)
  $effect(() => {
    const loadVoices = () => {
      const voiceNames = getEnglishVoices().map(v => v.name);
      charlatan.availableVoices = voiceNames;

      // Set default voice if not set
      if (!charlatan.voiceName && voiceNames.length > 0) {
        charlatan.voiceName =
          voiceNames.find(name => name === PREFERRED_VOICE) ||
          voiceNames.find(name => name.includes('Google')) ||
          voiceNames[0];
      }
    };

    untrack(loadVoices);
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  });

  // Handle Ambient Audio State
  $effect(() => {
    if (charlatan.ttsEnabled) ambient.play();
    else ambient.stop();
  });

  // Playback Loop
  $effect(() => {
    if (!charlatan.isPlaying) {
      cancelSpeech();
      return;
    }
    return untrack(() => startLoop(charlatan));
  });
</script>

<div class="app-container">
  <CinematicOverlay />
  <div class="viz-area">
    <ForceGraph />
    <ThemePrompt />
  </div>
  <aside class="sidebar">
    <StoryPanel />
  </aside>
  <Controls />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .viz-area {
    flex: 2;
    position: relative;
    overflow: hidden;
  }

  /* The story panel floats over the graph, top right */
  .sidebar {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    max-height: 80vh;
    padding: 1.5rem;
    pointer-events: none; /* Let clicks pass unless on panel */
  }

  @media (min-width: 768px) {
    .app-container {
      flex-direction: row;
    }

    .sidebar {
      max-width: 400px;
      min-width: 320px;
    }
  }
</style>
