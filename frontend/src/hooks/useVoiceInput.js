import { useState, useRef, useCallback } from 'react';

/**
 * useVoiceInput — wraps the Web Speech API for voice-to-text input.
 *
 * Usage:
 *   const { listening, supported, start, stop, transcript } = useVoiceInput({
 *     onResult: (text) => setText(prev => prev + ' ' + text),
 *     lang: 'en-US',
 *     continuous: true,
 *     silenceTimeoutMs: 3000,
 *   });
 *
 * Returns:
 *   listening        — boolean, true while recording
 *   supported        — boolean, false if browser doesn't support SpeechRecognition
 *   start()          — begin recording
 *   stop()           — stop recording
 *   transcript       — live interim text (not yet finalised)
 *   error            — string | null
 *   silenceCountdown — number | null, seconds remaining before auto-close (or null when not listening)
 */
export function useVoiceInput({
  onResult,
  lang             = 'en-US',
  continuous       = true,
  silenceTimeoutMs = 3000,   // ← close mic after this many ms of silence
} = {}) {
  const [listening,        setListening]        = useState(false);
  const [transcript,       setTranscript]        = useState('');
  const [error,            setError]             = useState(null);
  const [silenceCountdown, setSilenceCountdown]  = useState(null);

  const recognitionRef   = useRef(null);
  const silenceTimerRef  = useRef(null);   // auto-close timeout
  const countdownRef     = useRef(null);   // 1-second tick for the UI countdown

  const supported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Clear both the auto-close timer and the UI countdown tick. */
  function clearSilenceTimers() {
    clearTimeout(silenceTimerRef.current);
    clearInterval(countdownRef.current);
    silenceTimerRef.current = null;
    countdownRef.current    = null;
    setSilenceCountdown(null);
  }

  /**
   * (Re)start the silence timer. Called on mount and after every speech event.
   * If `silenceTimeoutMs` elapses without another call, the mic is closed.
   */
  function resetSilenceTimer(recognition) {
    clearSilenceTimers();

    // UI countdown (ticks every second)
    const totalSecs = Math.ceil(silenceTimeoutMs / 1000);
    setSilenceCountdown(totalSecs);

    countdownRef.current = setInterval(() => {
      setSilenceCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-close timeout
    silenceTimerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current);
      setSilenceCountdown(null);
      recognition?.stop();           // triggers onend → setListening(false)
    }, silenceTimeoutMs);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!supported) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition       = new SpeechRecognition();
    recognition.lang            = lang;
    recognition.continuous      = continuous;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      setTranscript('');
      resetSilenceTimer(recognition);   // start the silence clock
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // Any speech activity → reset the silence clock
      resetSilenceTimer(recognition);
      setTranscript(interim);

      if (final && onResult) {
        onResult(final);
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
      clearSilenceTimers();
      if (event.error === 'no-speech') {
        setError('No speech detected. Try speaking closer to the microphone.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions in your browser.');
      } else {
        setError('Voice input error: ' + event.error);
      }
      setListening(false);
    };

    recognition.onend = () => {
      clearSilenceTimers();
      setListening(false);
      setTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, listening, lang, continuous, onResult, silenceTimeoutMs]);

  const stop = useCallback(() => {
    clearSilenceTimers();
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop, transcript, error, silenceCountdown };
}