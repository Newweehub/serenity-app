import { useVoiceInput } from '../../hooks/useVoiceInput.js';
import './MicButton.css';

/**
 * MicButton — drop-in voice input button.
 *
 * Props:
 *   onResult(text)  — called with each finalised speech segment
 *   lang            — BCP-47 language code, default 'en-US'
 *   size            — 'sm' | 'md' (default 'md')
 *   title           — tooltip text
 */
export default function MicButton({ onResult, lang = 'en-US', size = 'md', title = 'Click to speak' }) {
  const { listening, supported, start, stop, transcript, error } = useVoiceInput({
    onResult,
    lang,
    continuous: true,
  });

  if (!supported) return null; // silently hide on unsupported browsers

  return (
    <div className="mic-wrapper">
      <button
        type="button"
        className={`mic-btn mic-btn-${size} ${listening ? 'listening' : ''}`}
        onClick={listening ? stop : start}
        title={listening ? 'Stop recording' : title}
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      >
        {listening ? '⏹' : '🎙'}
      </button>

      {listening && transcript && (
        <span className="mic-interim">{transcript}</span>
      )}

      {error && (
        <span className="mic-error">{error}</span>
      )}
    </div>
  );
}
