import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat.js';
import { useTTSContext } from '../../context/TTSContext.jsx';
import MicButton from './MicButton.jsx';
import './ChatPanel.css';

export default function ChatPanel({ initialMessage, placeholder = 'Talk to Serenity…' }) {
  const { messages, loading, error, send } = useChat();
  const { speak, speaking, supported: ttsSupported, enabled: ttsEnabled, toggle: toggleTTS } = useTTSContext();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const seeded    = useRef(false);
  const prevLen   = useRef(0);

  useEffect(() => {
    if (initialMessage && !seeded.current) {
      seeded.current = true;
      send(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (messages.length > prevLen.current) {
      const newest = messages[messages.length - 1];
      if (newest?.role === 'assistant') speak(newest.content);
    }
    prevLen.current = messages.length;
  }, [messages, speak]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="chat-panel">
      {/* TTS toggle in panel header */}
      {ttsSupported && (
        <div className="chat-panel-header">
          <button
            className={`tts-toggle ${ttsEnabled ? 'active' : ''}`}
            onClick={toggleTTS}
            title={ttsEnabled ? 'Turn off AI voice' : 'Turn on AI voice'}
          >
            {speaking ? '🔊' : ttsEnabled ? '🔈' : '🔇'}
            <span>{ttsEnabled ? (speaking ? 'Speaking…' : 'Voice on') : 'Voice off'}</span>
          </button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <p className="chat-empty">Your conversation will appear here…</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble ${msg.role === 'user' ? 'user' : 'assistant'} fade-up`}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {msg.role === 'assistant' && (
              <span className="bubble-avatar">🌿</span>
            )}
            <div className="bubble-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble assistant fade-in">
            <span className="bubble-avatar">🌿</span>
            <div className="bubble-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && (
          <p className="chat-error">Something went wrong. Please try again.</p>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <MicButton
          onResult={spoken => setInput(prev => (prev ? prev + ' ' : '') + spoken.trim())}
          size="sm"
          title="Speak your message"
        />
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={loading}
        />
        <button
          type="submit"
          className="chat-send"
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
