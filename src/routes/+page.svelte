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
  import OraclePanel from '$lib/ui/OraclePanel.svelte';

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
  <div class="viz-area">
    <ForceGraph />
    <CinematicOverlay />
    <div class="left-column">
      <ThemePrompt />
      <OraclePanel />
    </div>
    <aside class="sidebar">
      <StoryPanel />
    </aside>
  </div>
  <Controls />
</div>

<style>
  /* The graph fills everything above the controls; panels float over it */
  .app-container {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .viz-area {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* Theme and oracle, top left */
  .left-column {
    position: absolute;
    top: 1.25rem;
    left: 1.25rem;
    z-index: 45;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: min(360px, calc(100% - 2.5rem));
    max-height: calc(100% - 2.5rem);
    overflow-y: auto;
  }

  /* The story, right edge, full height */
  .sidebar {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    bottom: 2.75rem; /* Clear of the controls tab */
    z-index: 40;
    display: flex;
    flex-direction: column;
    width: 360px;
    pointer-events: none; /* Clicks reach the graph except on the panel itself */
  }

  /* Narrow screens: theme and oracle on top, the story docked at the bottom */
  @media (max-width: 767px) {
    .left-column {
      top: 0.75rem;
      left: 0.75rem;
      width: calc(100% - 1.5rem);
      max-height: 52%;
    }

    .sidebar {
      top: auto;
      left: 0.75rem;
      right: 0.75rem;
      bottom: 2.4rem;
      width: auto;
      height: 32%;
      justify-content: flex-end; /* Collapsed, the story header sits at the bottom */
    }
  }
</style>
