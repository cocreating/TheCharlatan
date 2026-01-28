
import { useState } from 'react';
import { useStore } from '../engine/store';

export function Controls() {
  const isPlaying = useStore(state => state.isPlaying);
  const togglePlay = useStore(state => state.togglePlay);
  const reset = useStore(state => state.reset);
  const speed = useStore(state => state.transitionSpeed);
  const setSpeed = useStore(state => state.setTransitionSpeed);
  const voiceSpeed = useStore(state => state.voiceSpeed);
  const setVoiceSpeed = useStore(state => state.setVoiceSpeed);

  const ttsEnabled = useStore(state => state.ttsEnabled);
  const setTtsEnabled = useStore(state => state.setTtsEnabled);
  const availableVoices = useStore(state => state.availableVoices);
  const voiceName = useStore(state => state.voiceName);
  const setVoiceName = useStore(state => state.setVoiceName);

  const glitchEnabled = useStore(state => state.glitchEnabled);
  const setGlitchEnabled = useStore(state => state.setGlitchEnabled);

  const [show, setShow] = useState(true);

  return (
    <div className={`controls-container ${show ? 'visible' : 'hidden'}`}>
         <div className="controls-toggle" onClick={() => setShow(!show)}>
            {show ? '▼' : '▲'} CONTROLS
         </div>

         <div className="controls-content">
            <div id="controls-buttons" className="controls-wrapper">
            <button
                className={`btn-play ${isPlaying ? 'active' : ''}`}
                onClick={togglePlay}
            >
                {isPlaying ? 'PLAY' : 'PAUSE'}
            </button>
            <button className="btn-reset" onClick={reset}>RESET</button>
            </div>

              <div id="controls-options" className="controls-wrapper">

            <div className="speed-control">

            <label className="toggle-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', margin: '0 1rem' }}>
               <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
               />
               AUDIO
            </label>

            {ttsEnabled && availableVoices.length > 0 && (
                <select
                  value={voiceName || ''}
                  onChange={(e) => setVoiceName(e.target.value)}
                  style={{ background: '#111', color: '#aaa', border: '1px solid #333', maxWidth: '100px', fontSize: '0.7rem' }}
                >
                   {availableVoices.map(v => (
                       <option key={v} value={v}>{v.replace('Google', '').replace('English', '').trim().substring(0, 10)}</option>
                   ))}
                </select>
            )}

            <label className="toggle-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', margin: '0 1rem', color: glitchEnabled ? '#ff3333' : '#aaa' }}>
               <input
                  type="checkbox"
                  checked={glitchEnabled}
                  onChange={(e) => setGlitchEnabled(e.target.checked)}
               />
               GLITCH
            </label>
            </div>
            </div>
 <div id="controls-sliders" className="controls-wrapper">
            <div style={{ display: 'flex', gap: '1rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                   <label>Flow Speed {speed.toFixed(1)}x</label>
                   <input
                     type="range"
                     min="0.5"
                     max="3.0"
                     step="0.1"
                     value={speed}
                     onChange={(e) => setSpeed(Number(e.target.value))}
                   />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                   <label>Voice Speed {voiceSpeed.toFixed(1)}x</label>
                   <input
                     type="range"
                     min="0.5"
                     max="3.0"
                     step="0.1"
                     value={voiceSpeed}
                     onChange={(e) => setVoiceSpeed(Number(e.target.value))}
                   />
               </div>
            </div>
            </div>

            <span className="status">SEQ: {history.length}</span>
         </div>
    </div>
  );
}
