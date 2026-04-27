import { useState, useRef, useCallback } from 'react';

/**
 * useVoiceInput — wraps the Web Speech API for voice-to-text input.
 *
 * Usage:
 *   const { listening, supported, start, stop, transcript } = useVoiceInput({
 *     onResult: (text) => setText(prev => prev + ' ' + text),
 *     lang: 'en-US',
 *     continuous: true,
 *   });
 *
 * Returns:
 *   listening   — boolean, true while recording
 *   supported   — boolean, false if browser doesn't support SpeechRecognition
 *   start()     — begin recording
 *   stop()      — stop recording
 *   transcript  — live interim text (not yet finalised)
 *   error       — string | null
 */
export function useVoiceInput({ onResult, lang = 'en-US', continuous = true } = {}) {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [error,       setError]       = useState(null);
  const recognitionRef = useRef(null);

  const supported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      setTranscript('');
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

      setTranscript(interim);
      if (final && onResult) {
        onResult(final);
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
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
      setListening(false);
      setTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, listening, lang, continuous, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop, transcript, error };
}
