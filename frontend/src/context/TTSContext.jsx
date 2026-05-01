import { createContext, useContext, useState, useCallback, useRef } from 'react';

const TTSContext = createContext(null);

export function TTSProvider({ children }) {
  const [enabled,  setEnabled]  = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [settings, setSettings] = useState({
    rate:  0.92,
    pitch: 1.05,
    lang:  'en-US',
    voiceName: '', // empty = auto-pick
  });
  const utterRef = useRef(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function pickVoice(voiceName) {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voiceName) {
      const named = voices.find(v => v.name === voiceName);
      if (named) return named;
    }
    return (
      voices.find(v => v.name === 'Google UK English Female') ||
      voices.find(v => v.name === 'Samantha') ||
      voices.find(v => v.lang?.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang?.startsWith('en')) ||
      voices[0] || null
    );
  }

  const speak = useCallback((text) => {
    if (!supported || !enabled || !text) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[#*_`~>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang  = settings.lang;
    u.rate  = settings.rate;
    u.pitch = settings.pitch;
    const voice = pickVoice(settings.voiceName);
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, [supported, enabled, settings]); // settings must be in deps so rate/pitch/voice changes take effect

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (enabled) stop();
    setEnabled(p => !p);
  }, [enabled, stop]);

  const updateSettings = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const getAvailableVoices = useCallback(() => {
    if (!supported) return [];
    return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
  }, [supported]);

  return (
    <TTSContext.Provider value={{ speak, stop, speaking, supported, enabled, toggle, settings, updateSettings, getAvailableVoices }}>
      {children}
    </TTSContext.Provider>
  );
}

export function useTTSContext() {
  return useContext(TTSContext);
}
