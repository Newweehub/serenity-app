import { useState, useCallback, useRef } from 'react';

/**
 * useTTS — Text-to-Speech hook using the Web Speech Synthesis API.
 *
 * Usage:
 *   const { speak, stop, speaking, supported, enabled, toggle } = useTTS();
 *   speak("Hello, I'm Serenity.");
 */
export function useTTS({ rate = 0.92, pitch = 1.05, lang = 'en-US' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [enabled,  setEnabled]  = useState(false); // user must opt-in
  const utteranceRef = useRef(null);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Pick the best available voice — prefer a soft female English voice
  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Priority: Google UK English Female > Samantha (macOS) > any English female > first English
    return (
      voices.find(v => v.name === 'Google UK English Female') ||
      voices.find(v => v.name === 'Samantha') ||
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null
    );
  }

  const speak = useCallback((text) => {
    if (!supported || !enabled || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown-style symbols and trim to reasonable length
    const clean = text
      .replace(/[#*_`~>\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500); // cap at 500 chars so long messages don't read forever

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang  = lang;
    utterance.rate  = rate;
    utterance.pitch = pitch;

    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [supported, enabled, lang, rate, pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      stop();
    }
    setEnabled(prev => !prev);
  }, [enabled, stop]);

  return { speak, stop, speaking, supported, enabled, toggle };
}
