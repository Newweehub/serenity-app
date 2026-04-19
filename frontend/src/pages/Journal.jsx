import { useState, useEffect, useRef } from "react";
import { useUser }                     from "../context/UserContext";
import { useLocation }                 from "react-router-dom";
import HandoffCard                     from "../components/HandoffCard";
import { markStepDone }                from "../utils/journey";
import { sendMessage, getJournalEntries } from "../services/api";

export default function Journal() {
  const { user }                        = useUser();
  const location                        = useLocation();
  const bottomRef                       = useRef(null);

  const [messages,      setMessages]    = useState([]);
  const [entries,       setEntries]     = useState([]);
  const [emotions,      setEmotions]    = useState([]);
  const [loading,       setLoading]     = useState(false);
  const [selected,      setSelected]    = useState(null);
  const [handoff,       setHandoff]     = useState(null);
  const [sessionEnded,  setSessionEnded] = useState(false);
  const [inputValue,    setInputValue]  = useState("");
  const [showEndPrompt, setShowEndPrompt] = useState(false);

  useEffect(() => {
    getJournalEntries(user.userId).then(setEntries).catch(() => {});
    setMessages([{
      role:    "ai",
      content: "Welcome back! What's on your mind today?"
    }]);
  }, [user.userId]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text) => {
    if (!text.trim() || loading || sessionEnded) return;
    setInputValue("");
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
      const themes  = res.response?.themes  || [];
      const handoffSignal = res.response?.handoff;

      if (emotion) setEmotions(e => [...new Set([...e, emotion])]);

      setMessages(m => [...m, { role: "ai", content }]);

      //after successful response:
      const userMessageCount = messages.filter(m => m.role === "user").length;
      if (userMessageCount === 0) {
        // First message sent — mark journal as started
        markStepDone(user.userId, "Journal");
      }

      // If agent signals handoff — end the session
      if (handoffSignal) {
        setHandoff(handoffSignal);
        setSessionEnded(true);
      }

      // Refresh past entries
      getJournalEntries(user.userId)
        .then(setEntries).catch(() => {});

    } catch (err) {
      console.error("Chat error:", err);
      setMessages(m => [...m, {
        role:    "ai",
        content: "I had trouble responding. Please try sending your message again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handoff config
  const handoffConfig = {
    mindfulness: {
      message:     emotions[0]
        ? `You've been feeling ${emotions[0]}. A short mindfulness session might help you process that.`
        : "Great reflection! Want to try a mindfulness exercise next?",
      buttonLabel: "Try mindfulness",
      to:          "/mindfulness",
      state:       { mood: emotions[0] || "neutral", fromJournal: true }
    },
    habit: {
      message:     "Want to turn something from today into a habit?",
      buttonLabel: "Go to habits",
      to:          "/habits",
      state:       {}
    }
  };

  const activeHandoff = handoff
    ? handoffConfig[handoff]
    : {
        message:     "When you're ready, continue to mindfulness.",
        buttonLabel: "Try mindfulness",
        to:          "/mindfulness",
        state:       { mood: emotions[0] || "neutral", fromJournal: true }
      };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Two-column grid — fixed height so columns don't overflow */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr)",
        gap: 12,
        height: "calc(100vh - 160px)"  // leaves room for handoff card
      }}>

        {/* ── Past entries (left column, scrollable) ── */}
        <div style={{
          background: "#fff",
          border: "0.5px solid #e0e0d8",
          borderRadius: 12,
          padding: 16,
          overflowY: "auto",   // ← scrollable
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            marginBottom: 12, flexShrink: 0
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
                padding: 10, borderRadius: 8,
                marginBottom: 8, flexShrink: 0,
                border: selected?.id === entry.id
                  ? "1px solid #1D9E75"
                  : "0.5px solid #e0e0d8",
                cursor: "pointer",
                background: selected?.id === entry.id
                  ? "#f9fffe" : "#fafaf8",
                transition: "border-color 0.15s"
              }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5
              }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {new Date(entry.date + "T00:00:00")
                    .toLocaleDateString("en-US", {
                      weekday: "short",
                      month:   "short",
                      day:     "numeric"
                    })}
                </div>
                <div style={{ fontSize: 10, color: "#bbb" }}>
                  {entry.firstTime}
                  {entry.lastTime && entry.lastTime !== entry.firstTime
                    ? ` – ${entry.lastTime}` : ""}
                </div>
              </div>
              <div style={{
                fontSize: 11, color: "#888", marginBottom: 6
              }}>
                {(entry.messages?.filter(m =>
                  m.role === "user").length || 0)} messages
              </div>
              <div style={{
                display: "flex", gap: 4, flexWrap: "wrap"
              }}>
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

        {/* ── Chat / Entry detail (right column) ── */}
        <div style={{
          background: "#fff",
          border: "0.5px solid #e0e0d8",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          minHeight: 0   // ← important for flex child to scroll
        }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 10, flexShrink: 0
          }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {selected
                ? new Date(selected.date + "T00:00:00")
                    .toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric"
                    })
                : "Today's journal"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {selected && (
                <button onClick={() => setSelected(null)} style={{
                  fontSize: 11, color: "#aaa",
                  background: "none", border: "none",
                  padding: 0, cursor: "pointer"
                }}>
                  ← Today
                </button>
              )}
              {/* End session button — only show when chatting */}
              {!selected && !sessionEnded && messages.length > 1 && (
                <button
                  onClick={() => setShowEndPrompt(true)}
                  style={{
                    fontSize: 11, color: "#1D9E75",
                    background: "none",
                    border: "0.5px solid #1D9E75",
                    borderRadius: 12, padding: "3px 10px",
                    cursor: "pointer"
                  }}>
                  End session
                </button>
              )}
            </div>
          </div>

          {/* Emotion tags — live session */}
          {!selected && emotions.length > 0 && (
            <div style={{
              display: "flex", gap: 6,
              flexWrap: "wrap", marginBottom: 10,
              flexShrink: 0
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
            /* ── Past entry detail with timestamps ── */
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {selected.messages?.map((m, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user"
                    ? "flex-end" : "flex-start",
                  marginBottom: 12
                }}>
                  <div style={{
                    fontSize: 10, color: "#bbb",
                    marginBottom: 3,
                    paddingLeft:  m.role === "ai"   ? 2 : 0,
                    paddingRight: m.role === "user" ? 2 : 0
                  }}>
                    {m.time}
                  </div>
                  <div style={{
                    background: m.role === "ai"
                      ? "#f1f0ea" : "#1D9E75",
                    color: m.role === "ai" ? "#2c2c2a" : "#fff",
                    borderRadius: m.role === "ai"
                      ? "12px 12px 12px 3px"
                      : "12px 12px 3px 12px",
                    padding: "9px 13px",
                    fontSize: 12, lineHeight: 1.6,
                    maxWidth: "80%"
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Today's live chat ── */
            <>
              {/* Scrollable messages area */}
              <div style={{
                flex: 1,
                overflowY: "auto",   // ← makes messages scroll
                minHeight: 0,        // ← essential for flex scroll
                marginBottom: 12,
                paddingRight: 4
              }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: m.role === "user"
                      ? "flex-end" : "flex-start",
                    marginBottom: 10
                  }}>
                    <div style={{
                      background: m.role === "ai"
                        ? "#f1f0ea" : "#1D9E75",
                      color: m.role === "ai" ? "#2c2c2a" : "#fff",
                      borderRadius: m.role === "ai"
                        ? "12px 12px 12px 3px"
                        : "12px 12px 3px 12px",
                      padding: "9px 13px",
                      fontSize: 12, lineHeight: 1.6,
                      maxWidth: "80%"
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{
                    background: "#f1f0ea",
                    borderRadius: "12px 12px 12px 3px",
                    padding: "9px 13px",
                    fontSize: 12, color: "#aaa",
                    display: "inline-block"
                  }}>
                    Thinking...
                  </div>
                )}

                {/* Session ended indicator */}
                {sessionEnded && (
                  <div style={{
                    textAlign: "center",
                    padding: "12px 0",
                    color: "#aaa",
                    fontSize: 11
                  }}>
                    ── Session complete ──
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* End session confirmation prompt */}
              {showEndPrompt && !sessionEnded && (
                <div style={{
                  background: "#E1F5EE", borderRadius: 10,
                  padding: "12px 14px", marginBottom: 10,
                  flexShrink: 0
                }}>
                  <div style={{
                    fontSize: 12, color: "#085041",
                    marginBottom: 8, lineHeight: 1.5
                  }}>
                    End your journaling session and move to mindfulness?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        setSessionEnded(true);
                        setShowEndPrompt(false);
                        markStepDone(user.userId, "Journal");
                        // Set handoff based on detected emotions
                        if (!handoff) setHandoff("mindfulness");
                      }}
                      style={{
                        padding: "5px 14px", borderRadius: 16,
                        background: "#1D9E75", border: "none",
                        fontSize: 11, color: "#fff", cursor: "pointer"
                      }}>
                      Yes, end session
                    </button>
                    <button
                      onClick={() => setShowEndPrompt(false)}
                      style={{
                        padding: "5px 14px", borderRadius: 16,
                        background: "transparent",
                        border: "0.5px solid #9FE1CB",
                        fontSize: 11, color: "#085041", cursor: "pointer"
                      }}>
                      Keep writing
                    </button>
                  </div>
                </div>
              )}

              {/* Input — hidden when session ends */}
              {!sessionEnded ? (
                <div style={{
                  display: "flex", gap: 8,
                  alignItems: "center",
                  borderTop: "0.5px solid #e0e0d8",
                  paddingTop: 10, flexShrink: 0
                }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e =>
                      e.key === "Enter" && handleSend(inputValue)}
                    placeholder="Write your thoughts..."
                    style={{ flex: 1, borderRadius: 20 }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSend(inputValue)}
                    disabled={loading || !inputValue.trim()}
                    style={{
                      width: 32, height: 32,
                      borderRadius: "50%",
                      background: "#1D9E75",
                      border: "none", color: "#fff",
                      fontSize: 16, cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                    →
                  </button>
                </div>
              ) : (
                /* Session ended — show prompt to continue */
                <div style={{
                  borderTop: "0.5px solid #e0e0d8",
                  paddingTop: 10, flexShrink: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: 12, color: "#aaa" }}>
                    Ready for your next step?
                  </span>
                  <button
                    onClick={() => {
                      setSessionEnded(false);
                      setHandoff(null);
                      setMessages([{
                        role:    "ai",
                        content: "Welcome back! What else is on your mind?"
                      }]);
                    }}
                    style={{
                      fontSize: 11, color: "#1D9E75",
                      background: "none", border: "none",
                      cursor: "pointer", padding: 0
                    }}>
                    Continue writing instead
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Handoff card — OUTSIDE the grid ── */}
      <div style={{ marginTop: 12 }}>
        <HandoffCard
          message={activeHandoff.message}
          buttonLabel={activeHandoff.buttonLabel}
          to={activeHandoff.to}
          state={activeHandoff.state}
        />
      </div>
    </div>
  );
}