import { useState }         from "react";
import { useUser }          from "../context/UserContext";
import ChatWindow           from "../components/ChatWindow";
import { sendMessage,
         addHabit }         from "../services/api";

const EXERCISES = [
  { name: "Box breathing",
    sub:  "5 min · calm anxiety",   mood: "anxious"  },
  { name: "Body scan",
    sub:  "10 min · deep grounding", mood: "tired"   },
  { name: "4-7-8 breathing",
    sub:  "3 min · sleep prep",      mood: "stressed" },
  { name: "Gratitude reflection",
    sub:  "5 min · boost mood",      mood: "calm"    }
];

export default function Mindfulness() {
  const { user }                        = useUser();
  const [active,   setActive]           = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading,  setLoading]          = useState(false);
  const [added,    setAdded]            = useState(false);

  const startExercise = async (ex) => {
    setActive(ex);
    setAdded(false);
    setMessages([]);
    setLoading(true);
    try {
      const res = await sendMessage(
        user.userId,
        `I want to start ${ex.name}`,
        ex.mood, []
      );
      setMessages([{
        role:    "ai",
        content: res.response?.content || ""
      }]);
    } catch {
      setMessages([{
        role:    "ai",
        content: "Let's begin. Take a comfortable seat and close your eyes."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text) => {
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({
        role:    m.role === "ai" ? "assistant" : "user",
        content: m.content
      }));
      const res = await sendMessage(user.userId, text, null, history);
      setMessages(m => [...m, {
        role:    "ai",
        content: res.response?.content || ""
      }]);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async () => {
    if (!active || added) return;
    try {
      await addHabit(user.userId, `Daily ${active.name}`, "mindfulness");
      setAdded(true);
    } catch {}
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
      gap: 12, height: "calc(100vh - 112px)"
    }}>
      {/* Exercise panel */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        {!active ? (
          <div style={{ width: "100%" }}>
            <div style={{
              fontSize: 13, fontWeight: 500,
              marginBottom: 14, textAlign: "center"
            }}>
              Choose an exercise
            </div>
            {EXERCISES.map((ex, i) => (
              <div key={i} onClick={() => startExercise(ex)}
                style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "12px 14px",
                  borderRadius: 10,
                  border: "0.5px solid #e0e0d8",
                  marginBottom: 8, cursor: "pointer",
                  background: "#fafaf8",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e =>
                  e.currentTarget.style.background = "#f1f0ea"}
                onMouseLeave={e =>
                  e.currentTarget.style.background = "#fafaf8"}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {ex.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    {ex.sub}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: "#1D9E75", fontWeight: 500
                }}>
                  Start →
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>
              {active.name}
            </div>
            {/* Breathing circle */}
            <div style={{
              width: 110, height: 110, borderRadius: "50%",
              border: "2px solid #1D9E75", background: "#E1F5EE",
              display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px",
              fontSize: 32
            }}>
              ✦
            </div>
            <div style={{
              display: "flex", gap: 8,
              justifyContent: "center", marginBottom: 16
            }}>
              <button onClick={() => { setActive(null); setMessages([]); }}
                style={{ padding: "7px 16px" }}>
                ← Back
              </button>
              <button
                onClick={handleAddHabit}
                disabled={added}
                style={{
                  padding: "7px 16px",
                  background: added ? "#aaa" : "#1D9E75",
                  border: "none", color: "#fff", borderRadius: 8
                }}>
                {added ? "Added ✓" : "+ Add to habit board"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Coach chat */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          fontSize: 13, fontWeight: 500, marginBottom: 12
        }}>
          Coach Luna
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            loading={loading}
            disabled={!active}
            placeholder={active
              ? "Reply to your coach..."
              : "Select an exercise to begin"}
          />
        </div>
      </div>
    </div>
  );
}