import { createContext, useContext, useState, useCallback, useRef } from 'react';

const TTSContext = createContext(null);

export function TTSProvider({ children }) {
  const [enabled,  setEnabled]  = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function pickVoice() {
    const voices = window.speechSynthesis?.getVoices() ?? [];
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
    u.lang  = 'en-US';
    u.rate  = 0.92;
    u.pitch = 1.05;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
  }, [supported, enabled]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (enabled) stop();
    setEnabled(p => !p);
  }, [enabled, stop]);

  return (
    <TTSContext.Provider value={{ speak, stop, speaking, supported, enabled, toggle }}>
      {children}
    </TTSContext.Provider>
  );
}

export function useTTSContext() {
  return useContext(TTSContext);
}
