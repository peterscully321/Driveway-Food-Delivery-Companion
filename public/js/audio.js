/**
 * Web Audio API Sound Synthesizer
 * Provides sleek futuristic acoustic feedback with zero external audio assets
 */

const AudioFX = (function () {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        ctx = new AudioContext();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function playClick() {
    try {
      const c = getContext();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.05);
    } catch (e) {}
  }

  function playSuccess() {
    try {
      const c = getContext();
      if (!c) return;
      const now = c.currentTime;

      // Note 1
      const osc1 = c.createOscillator();
      const gain1 = c.createGain();
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(c.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Note 2 (chord harmony)
      const osc2 = c.createOscillator();
      const gain2 = c.createGain();
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.18, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(c.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);

      // Note 3 (chime resolution)
      const osc3 = c.createOscillator();
      const gain3 = c.createGain();
      osc3.frequency.setValueAtTime(1046.50, now + 0.16); // C6
      gain3.gain.setValueAtTime(0.2, now + 0.16);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc3.connect(gain3);
      gain3.connect(c.destination);
      osc3.start(now + 0.16);
      osc3.stop(now + 0.45);
    } catch (e) {}
  }

  function playVoiceBeep() {
    try {
      const c = getContext();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.12);
    } catch (e) {}
  }

  return {
    playClick,
    playSuccess,
    playVoiceBeep
  };
})();

window.AudioFX = AudioFX;
