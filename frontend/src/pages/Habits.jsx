import { useState, useEffect }             from "react";
import { useUser }                         from "../context/UserContext";
import ChatWindow                          from "../components/ChatWindow";
import { getHabits, addHabit, checkOffHabit,
         getHabitSuggestion, sendMessage } from "../services/api";

export default function Habits() {
  const { user }                           = useUser();
  const [habits,     setHabits]            = useState([]);
  const [suggestion, setSuggestion]        = useState(null);
  const [messages,   setMessages]          = useState([]);
  const [loading,    setLoading]           = useState(false);
  const [newHabit,   setNewHabit]          = useState("");
  const [addedSug,   setAddedSug]          = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    getHabits(user.userId).then(setHabits).catch(() => {});
    getHabitSuggestion(user.userId).then(setSuggestion).catch(() => {});
    setMessages([{
      role:    "ai",
      content: "Hi! I'm Max, your habit coach. How are your habits going today?"
    }]);
  }, [user.userId]);

  const handleAddHabit = async () => {
    if (!newHabit.trim()) return;
    try {
      const habit = await addHabit(user.userId, newHabit.trim());
      setHabits(h => [habit, ...h]);
      setNewHabit("");
    } catch {}
  };

  const handleCheck = async (habitId) => {
    try {
      const updated = await checkOffHabit(user.userId, habitId);
      setHabits(h => h.map(x => x.id === habitId ? updated : x));
    } catch {}
  };

  const handleAddSuggestion = async () => {
    if (!suggestion || addedSug) return;
    try {
      const habit = await addHabit(
        user.userId, suggestion.name, suggestion.category
      );
      setHabits(h => [habit, ...h]);
      setAddedSug(true);
    } catch {}
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

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
      gap: 12, height: "calc(100vh - 112px)"
    }}>
      {/* Habit board */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16, overflowY: "auto"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14
        }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            My habit board
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text" value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddHabit()}
              placeholder="New habit..."
              style={{ width: 140, borderRadius: 20,
                       padding: "5px 10px" }}
            />
            <button onClick={handleAddHabit} style={{
              padding: "5px 12px", borderRadius: 20,
              background: "#1D9E75", border: "none",
              fontSize: 11, color: "#fff", whiteSpace: "nowrap"
            }}>
              + Add
            </button>
          </div>
        </div>

        {habits.length === 0 && (
          <div style={{ fontSize: 12, color: "#bbb" }}>
            No habits yet — add one above or accept a suggestion!
          </div>
        )}

        {habits.map(h => {
          const doneToday = h.completedDates?.includes(today);
          const pct = Math.min(Math.round((h.streak / 7) * 100), 100);
          return (
            <div key={h.id} style={{
              display: "flex", alignItems: "center",
              gap: 10, padding: "10px 0",
              borderBottom: "0.5px solid #e0e0d8"
            }}>
              {/* Check circle */}
              <div
                onClick={() => !doneToday && handleCheck(h.id)}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "1.5px solid #1D9E75",
                  background: doneToday ? "#1D9E75" : "transparent",
                  cursor: doneToday ? "default" : "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0
                }}>
                {doneToday && (
                  <svg width="10" height="10" fill="none"
                       viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3"
                          stroke="#fff" strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 4
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {h.name}
                  </div>
                  <span style={{
                    padding: "1px 7px", borderRadius: 8,
                    fontSize: 10, fontWeight: 500,
                    background: doneToday ? "#E1F5EE" : "#f1f0ea",
                    color: doneToday ? "#085041" : "#aaa"
                  }}>
                    {h.streak} day streak
                  </span>
                </div>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: "#e0e0d8", overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: "#1D9E75", width: `${pct}%`,
                    transition: "width 0.3s"
                  }} />
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Suggestion */}
        {suggestion && !addedSug && (
          <div style={{
            background: "#FAEEDA", borderRadius: 10,
            padding: "10px 12px", marginTop: 14
          }}>
            <div style={{
              fontSize: 11, color: "#633806",
              fontWeight: 500, marginBottom: 4
            }}>
              AI suggestion
            </div>
            <div style={{
              fontSize: 12, color: "#854F0B",
              lineHeight: 1.5, marginBottom: 8
            }}>
              {suggestion.reason}
            </div>
            <button onClick={handleAddSuggestion} style={{
              width: "100%", padding: 6, borderRadius: 8,
              background: "#854F0B", border: "none",
              fontSize: 11, color: "#fff"
            }}>
              Add "{suggestion.name}"
            </button>
          </div>
        )}
      </div>

      {/* Habit coach */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          fontSize: 13, fontWeight: 500, marginBottom: 12
        }}>
          Coach Max
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            loading={loading}
            placeholder="Talk to your habit coach..."
          />
        </div>
      </div>
    </div>
  );
}