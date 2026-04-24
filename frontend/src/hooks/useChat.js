import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';

/**
 * Manages a chat session with the Serenity backend.
 * Maintains history in memory; calls endSession on unmount if active.
 */
export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    setError(null);

    try {
      const { reply, intent } = await api.chat.send(text, messages);
      setMessages([...history, { role: 'assistant', content: reply, intent }]);
    } catch (err) {
      setError(err.message);
      // Remove the optimistic user message on failure
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const endSession = useCallback(async () => {
    if (messages.length === 0) return;
    await api.chat.endSession(messages).catch(() => {});
    setMessages([]);
  }, [messages]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, loading, error, send, endSession, clear };
}
