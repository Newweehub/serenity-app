import { useState, useEffect }          from "react";
import { useUser }                      from "../context/UserContext";
import ChatWindow                       from "../components/ChatWindow";
import { sendMessage, getJournalEntries,
         createJournalEntry }           from "../services/api";

export default function Journal() {
  const { user }                        = useUser();
  const [messages,  setMessages]        = useState([]);
  const [entries,   setEntries]         = useState([]);
  const [emotions,  setEmotions]        = useState([]);
  const [loading,   setLoading]         = useState(false);
  const [selected,  setSelected]        = useState(null);

  useEffect(() => {
    getJournalEntries(user.userId).then(setEntries).catch(() => {});
    setMessages([{
      role:    "ai",
      content: "Welcome back! What's on your mind today?"
    }]);
  }, [user.userId]);

  const handleSend = async (text) => {
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({
        role:    m.role === "ai" ? "assistant" : "user",
        content: m.content
      }));
      const res     = await sendMessage(user.userId, text, null, history);
      const content = res.response?.content || "";
      const emotion = res.response?.emotion;
      const themes  = res.response?.themes || [];

      if (emotion) setEmotions(e => [...new Set([...e, emotion])]);
      setMessages(m => [...m, { role: "ai", content }]);

      // Auto-save after user has written 2+ messages
      const userMsgs = messages.filter(m => m.role === "user");
      if (userMsgs.length >= 1) {
        const fullText = [...userMsgs, { content: text }]
          .map(m => m.content).join(" ");
        const saved = await createJournalEntry(
          user.userId, fullText, emotion, themes
        );
        setEntries(e => [saved, ...e.filter(x => x.id !== saved.id)]);
      }
    } catch {
      setMessages(m => [...m, {
        role:    "ai",
        content: "Something went wrong. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr)",
      gap: 12, height: "calc(100vh - 112px)"
    }}>
      {/* Past entries */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16, overflowY: "auto"
      }}>
        <div style={{
          fontSize: 13, fontWeight: 500, marginBottom: 12
        }}>
          Past entries
        </div>
        {entries.length === 0 && (
          <div style={{ fontSize: 12, color: "#bbb" }}>
            No entries yet — start writing!
          </div>
        )}
        {entries.map(entry => (
          <div key={entry.id}
            onClick={() => setSelected(
              selected?.id === entry.id ? null : entry
            )}
            style={{
              padding: 10, borderRadius: 8, marginBottom: 8,
              border: selected?.id === entry.id
                ? "1px solid #1D9E75"
                : "0.5px solid #e0e0d8",
              cursor: "pointer", background: "#fafaf8",
              transition: "border-color 0.15s"
            }}>
            <div style={{
              fontSize: 12, fontWeight: 500, marginBottom: 4
            }}>
              {new Date(entry.date).toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric"
              })}
            </div>
            <div style={{
              fontSize: 11, color: "#888",
              lineHeight: 1.5, marginBottom: 6
            }}>
              {entry.text?.substring(0, 80)}
              {entry.text?.length > 80 ? "..." : ""}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {entry.emotions?.map((e, i) => (
                <span key={i} style={{
                  padding: "1px 7px", borderRadius: 8,
                  fontSize: 10, fontWeight: 500,
                  background: "#E1F5EE", color: "#085041"
                }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Chat / entry detail */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 12
        }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {selected ? "Entry detail" : "Today's journal"}
          </div>
          {selected && (
            <button onClick={() => setSelected(null)} style={{
              fontSize: 11, color: "#aaa", background: "none",
              border: "none", padding: 0
            }}>
              ← Back to chat
            </button>
          )}
        </div>

        {/* Emotion tags */}
        {!selected && emotions.length > 0 && (
          <div style={{
            display: "flex", gap: 6,
            flexWrap: "wrap", marginBottom: 10
          }}>
            {emotions.map((e, i) => (
              <span key={i} style={{
                padding: "2px 8px", borderRadius: 10,
                fontSize: 11, fontWeight: 500,
                background: "#EEEDFE", color: "#3C3489"
              }}>
                {e}
              </span>
            ))}
          </div>
        )}

        {selected ? (
          /* Full entry view */
          <div style={{ flex: 1, overflowY: "auto" }}>
            <p style={{
              fontSize: 12, color: "#555",
              lineHeight: 1.8
            }}>
              {selected.text}
            </p>
          </div>
        ) : (
          /* Chat */
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatWindow
              messages={messages}
              onSend={handleSend}
              loading={loading}
              placeholder="Write your thoughts..."
            />
          </div>
        )}
      </div>
    </div>
  );
}