import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat.js';
import './ChatPanel.css';

export default function ChatPanel({ initialMessage, placeholder = 'Talk to Serenity…' }) {
  const { messages, loading, error, send } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const seeded    = useRef(false);

  // Seed with an initial AI greeting if provided
  useEffect(() => {
    if (initialMessage && !seeded.current) {
      seeded.current = true;
      send(initialMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
