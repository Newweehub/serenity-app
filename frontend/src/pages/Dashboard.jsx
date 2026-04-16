import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useUser }             from "../context/UserContext";
import { checkInMood, getStats,
         getHabitSuggestion, addHabit } from "../services/api";

const MOODS = [
  { emoji: "😔", label: "sad"        },
  { emoji: "😐", label: "neutral"    },
  { emoji: "😊", label: "happy"      },
  { emoji: "😌", label: "calm"       },
  { emoji: "😤", label: "frustrated" }
];

const FOCUS_ITEMS = [
  { label: "Morning breathing", sub: "5 min · mindfulness",
    accent: "#E1F5EE", color: "#1D9E75", path: "/mindfulness" },
  { label: "Daily journal",     sub: "Reflect on your day",
    accent: "#EEEDFE", color: "#534AB7", path: "/journal"     }
];

export default function Dashboard() {
  const { user }            = useUser();
  const navigate            = useNavigate();
  const [mood,       setMood]       = useState(null);
  const [aiMessage,  setAiMessage]  = useState("");
  const [stats,      setStats]      = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [addedHabit, setAddedHabit] = useState(false);

  useEffect(() => {
    getStats(user.userId).then(setStats).catch(() => {});
    getHabitSuggestion(user.userId).then(setSuggestion).catch(() => {});
  }, [user.userId]);

  const handleMood = async (index) => {
    setMood(index);
    try {
      const res = await checkInMood(user.userId, MOODS[index].label);
      setAiMessage(res.message);
    } catch {}
  };

  const handleAddSuggestion = async () => {
    if (!suggestion) return;
    try {
      await addHabit(user.userId, suggestion.name, suggestion.category);
      setAddedHabit(true);
    } catch {}
  };

  // Compute habit completion %
  const completionPct = stats?.habitStats?.length
    ? Math.round(
        (stats.habitStats.reduce((a, h) => a + h.completed, 0) /
         (stats.habitStats.length * 7)) * 100
      )
    : 0;

  return (
    <div>
      {/* Mood check-in */}
      <div style={{
        background: "#E1F5EE", borderRadius: 14,
        padding: "16px 18px", marginBottom: 20
      }}>
        <div style={{
          fontSize: 12, color: "#085041",
          fontWeight: 500, marginBottom: 10
        }}>
          How are you feeling today?
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => handleMood(i)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10,
              border: mood === i
                ? "1.5px solid #1D9E75"
                : "0.5px solid #9FE1CB",
              background: mood === i ? "#9FE1CB" : "#fff",
              fontSize: 20
            }}>
              {m.emoji}
            </button>
          ))}
        </div>
        {aiMessage && (
          <div style={{
            fontSize: 12, color: "#0F6E56",
            lineHeight: 1.6, marginTop: 4
          }}>
            {aiMessage}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0,1fr))",
          gap: 10, marginBottom: 20
        }}>
          {[
            { val: stats.journalCount,
              label: "journals this week", color: "#534AB7" },
            { val: `${completionPct}%`,
              label: "habit completion",   color: "#1D9E75" },
            { val: Object.keys(stats.emotions || {}).length,
              label: "emotions tracked",   color: "#1D9E75" },
            { val: user.streakDays || 0,
              label: "day streak",         color: "#D4537E" }
          ].map((s, i) => (
            <div key={i} style={{
              background: "#f1f0ea",
              borderRadius: 8, padding: "12px 14px"
            }}>
              <div style={{
                fontSize: 22, fontWeight: 500, color: s.color
              }}>
                {s.val}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Focus + suggestion */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
        gap: 12
      }}>
        {/* Today's focus */}
        <div style={{
          background: "#fff", border: "0.5px solid #e0e0d8",
          borderRadius: 12, padding: 16
        }}>
          <div style={{
            fontSize: 13, fontWeight: 500, marginBottom: 12
          }}>
            Today's focus
          </div>
          {FOCUS_ITEMS.map((item, i) => (
            <div key={i} onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center",
                gap: 10, padding: "10px 12px", borderRadius: 10,
                border: "0.5px solid #e0e0d8", marginBottom: 8,
                cursor: "pointer", background: "#fafaf8",
                transition: "background 0.15s"
              }}
              onMouseEnter={e =>
                e.currentTarget.style.background = "#f1f0ea"}
              onMouseLeave={e =>
                e.currentTarget.style.background = "#fafaf8"}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: item.accent, flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: "#aaa" }}>
                  {item.sub}
                </div>
              </div>
              <div style={{
                fontSize: 11, color: item.color, fontWeight: 500
              }}>
                Start →
              </div>
            </div>
          ))}
        </div>

        {/* AI suggestion */}
        {suggestion && (
          <div style={{
            background: "#fff", border: "0.5px solid #e0e0d8",
            borderRadius: 12, padding: 16
          }}>
            <div style={{
              fontSize: 13, fontWeight: 500, marginBottom: 10
            }}>
              AI suggestion
            </div>
            <div style={{
              background: "#FAEEDA", borderRadius: 8,
              padding: "10px 12px", marginBottom: 10
            }}>
              <div style={{
                fontSize: 11, color: "#633806",
                fontWeight: 500, marginBottom: 4
              }}>
                {suggestion.name}
              </div>
              <div style={{
                fontSize: 12, color: "#854F0B", lineHeight: 1.5
              }}>
                {suggestion.reason}
              </div>
            </div>
            <button
              onClick={handleAddSuggestion}
              disabled={addedHabit}
              style={{
                width: "100%", padding: 7, borderRadius: 8,
                background: addedHabit ? "#aaa" : "#1D9E75",
                border: "none", fontSize: 12, color: "#fff"
              }}>
              {addedHabit ? "Added to board ✓" : "Add habit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}