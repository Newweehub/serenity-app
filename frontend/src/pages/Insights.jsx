import { useState, useEffect }          from "react";
import { useUser }                      from "../context/UserContext";
import HandoffCard                      from "../components/HandoffCard";
import { markStepDone }                 from "../utils/journey";
import { getInsights, getStats,
         addHabit }                     from "../services/api";

// Add these to api.js if not already there:
// export const getMonthlyInsights = (userId) =>
//   api.get(`/insights/${userId}/monthly`).then(r => r.data);
// export const getAllTimeInsights = (userId) =>
//   api.get(`/insights/${userId}/alltime`).then(r => r.data);

const VIEWS = [
  { key: "weekly",  label: "This week",  desc: "Last 7 days"            },
  { key: "monthly", label: "This month", desc: "Last 30 days"           },
  { key: "alltime", label: "All time",   desc: "Since your first entry" }
];

export default function Insights() {
  const { user }                        = useUser();
  const [view,        setView]          = useState("weekly");
  const [data,        setData]          = useState({});
  const [loading,     setLoading]       = useState(true);
  const [addedHabit,  setAddedHabit]    = useState(false);

  const isWeekend = [0, 6].includes(new Date().getDay());

  useEffect(() => {
    loadView("weekly");
  }, [user.userId]);

  // Mark insights as read after 3 seconds
  useEffect(() => {
    if (data.weekly?.reflection) {
      const t = setTimeout(() =>
        markStepDone(user.userId, "Insights"), 3000);
      return () => clearTimeout(t);
    }
  }, [data.weekly]);

  const loadView = async (v) => {
    if (data[v]) return; // already loaded — use cache
    setLoading(true);
    try {
      let result;
      if (v === "weekly") {
        const [ins, st] = await Promise.all([
          getInsights(user.userId),
          getStats(user.userId)
        ]);
        result = { ...ins, stats: st };
      } else if (v === "monthly") {
        const { default: api } = await import("../services/api");
        // call monthly endpoint
        result = await fetch(
          `/api/insights/${user.userId}/monthly`
        ).then(r => r.json());
      } else {
        result = await fetch(
          `/api/insights/${user.userId}/alltime`
        ).then(r => r.json());
      }
      setData(d => ({ ...d, [v]: result }));
    } catch (err) {
      console.error("Insights load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (v) => {
    setView(v);
    setAddedHabit(false);
    loadView(v);
  };

  const handleAddHabit = async () => {
    const current = data[view];
    if (!current?.suggestedHabit || addedHabit) return;
    try {
      await addHabit(
        user.userId,
        current.suggestedHabit.name,
        "insights"
      );
      setAddedHabit(true);
    } catch (err) {
      console.error("Add habit error:", err);
    }
  };

  const current    = data[view] || {};
  const stats      = current.stats || current.data || {};
  const habitStats = stats.habitStats || current.data?.habitStats || [];

  const completionPct = habitStats.length
    ? Math.round(
        (habitStats.reduce((a, h) => a + h.completed, 0) /
         (habitStats.length * 7)) * 100
      )
    : 0;

  const emotions    = stats.emotions || current.data?.emotions || {};
  const topEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxCount    = topEmotions[0]?.[1] || 1;
  const COLORS      = ["#1D9E75", "#EF9F27", "#534AB7", "#D4537E"];

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* View toggle */}
      <div style={{
        display: "flex", gap: 8,
        marginBottom: 16, flexWrap: "wrap"
      }}>
        {VIEWS.map(v => (
          <button key={v.key}
            onClick={() => handleViewChange(v.key)}
            style={{
              padding: "7px 16px", borderRadius: 20,
              background: view === v.key ? "#1D9E75" : "#f1f0ea",
              border: "none",
              color: view === v.key ? "#fff" : "#888",
              fontSize: 12, cursor: "pointer",
              fontWeight: view === v.key ? 500 : 400,
              transition: "all 0.15s"
            }}>
            {v.label}
          </button>
        ))}
        <span style={{
          fontSize: 11, color: "#bbb",
          alignSelf: "center", marginLeft: 4
        }}>
          {VIEWS.find(v => v.key === view)?.desc}
          {view === "alltime" && current.data?.daysSince
            ? ` · ${current.data.daysSince} days`
            : ""}
        </span>
      </div>

      {/* Weekend gate — only for weekly */}
      {view === "weekly" && !isWeekend && (
        <div style={{
          background: "#FAEEDA", borderRadius: 12,
          padding: "12px 16px", marginBottom: 16,
          fontSize: 12, color: "#633806", lineHeight: 1.6
        }}>
          Your weekly AI reflection will be ready on the weekend
          when your full week of data is in.
        </div>
      )}

      {loading && (
        <div style={{
          fontSize: 12, color: "#aaa",
          padding: "20px 0", textAlign: "center"
        }}>
          Loading {view} insights...
        </div>
      )}

      {!loading && (
        <>
          {/* Metric cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 10, marginBottom: 16
          }}>
            {[
              {
                val:   stats.journalCount ||
                       current.data?.journalCount || 0,
                label: view === "weekly"  ? "journals this week"
                     : view === "monthly" ? "journals this month"
                     : "journals total",
                color: "#534AB7"
              },
              {
                val:   `${completionPct}%`,
                label: "habit completion",
                color: "#1D9E75"
              },
              {
                val:   habitStats.length,
                label: "active habits",
                color: "#1D9E75"
              },
              {
                val:   stats.topEmotion ||
                       current.data?.topEmotion || "—",
                label: "top emotion",
                color: "#D4537E"
              }
            ].map((s, i) => (
              <div key={i} style={{
                background: "#f1f0ea",
                borderRadius: 8, padding: "12px 14px"
              }}>
                <div style={{
                  fontSize: 20, fontWeight: 500, color: s.color
                }}>
                  {s.val}
                </div>
                <div style={{
                  fontSize: 11, color: "#aaa", marginTop: 2
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 12
          }}>
            {/* Left — charts */}
            <div style={{
              background: "#fff",
              border: "0.5px solid #e0e0d8",
              borderRadius: 12, padding: 16
            }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                marginBottom: 14
              }}>
                Mood breakdown
              </div>

              {topEmotions.length === 0 ? (
                <div style={{ fontSize: 12, color: "#bbb" }}>
                  No mood data yet.
                </div>
              ) : topEmotions.map(([emotion, count], i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center",
                  gap: 10, marginBottom: 12
                }}>
                  <div style={{
                    fontSize: 12, color: "#888",
                    width: 90, flexShrink: 0
                  }}>
                    {emotion}
                  </div>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: "#e0e0d8", overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: COLORS[i % COLORS.length],
                      width: `${Math.round(
                        (count / maxCount) * 100
                      )}%`,
                      transition: "width 0.5s"
                    }} />
                  </div>
                  <div style={{
                    fontSize: 11, color: "#aaa",
                    width: 48, textAlign: "right",
                    flexShrink: 0
                  }}>
                    {count}×
                  </div>
                </div>
              ))}

              {/* Day-of-week pattern — monthly and alltime only */}
              {(view === "monthly" || view === "alltime") &&
               current.data?.dayBreakdown && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    marginTop: 16, marginBottom: 10,
                    paddingTop: 12,
                    borderTop: "0.5px solid #e0e0d8"
                  }}>
                    Most active days
                  </div>
                  {Object.entries(current.data.dayBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([day, count], i) => (
                      <div key={i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10, marginBottom: 8
                      }}>
                        <div style={{
                          fontSize: 12, color: "#888",
                          width: 90, flexShrink: 0
                        }}>
                          {day.substring(0, 3)}
                        </div>
                        <div style={{
                          flex: 1, height: 6, borderRadius: 3,
                          background: "#e0e0d8", overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 3,
                            background: "#534AB7",
                            width: `${Math.round(
                              (count /
                               Math.max(...Object.values(
                                 current.data.dayBreakdown
                               ))) * 100
                            )}%`
                          }} />
                        </div>
                        <div style={{
                          fontSize: 11, color: "#aaa",
                          width: 32, textAlign: "right",
                          flexShrink: 0
                        }}>
                          {count}×
                        </div>
                      </div>
                    ))}
                </>
              )}

              {/* Habit completion */}
              {habitStats.length > 0 && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: 500,
                    marginTop: 16, marginBottom: 10,
                    paddingTop: 12,
                    borderTop: "0.5px solid #e0e0d8"
                  }}>
                    Habit completion
                  </div>
                  {habitStats.map((h, i) => {
                    const pct = Math.round(
                      (h.completed / h.total) * 100
                    );
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center",
                        gap: 10, marginBottom: 10
                      }}>
                        <div style={{
                          fontSize: 12, color: "#888",
                          width: 90, flexShrink: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {h.name}
                        </div>
                        <div style={{
                          flex: 1, height: 6, borderRadius: 3,
                          background: "#e0e0d8", overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 3,
                            background: "#1D9E75",
                            width: `${pct}%`,
                            transition: "width 0.5s"
                          }} />
                        </div>
                        <div style={{
                          fontSize: 11, color: "#aaa",
                          width: 32, textAlign: "right",
                          flexShrink: 0
                        }}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Right — AI reflection */}
            <div style={{
              background: "#fff",
              border: "0.5px solid #e0e0d8",
              borderRadius: 12, padding: 16
            }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                marginBottom: 14
              }}>
                {view === "weekly"  ? "Weekly reflection"
               : view === "monthly" ? "Monthly reflection"
               : "Your journey so far"}
              </div>

              {(view === "weekly" && !isWeekend) ? (
                <div style={{
                  background: "#f1f0ea", borderRadius: 10,
                  padding: "14px 16px", fontSize: 12,
                  color: "#888", lineHeight: 1.7
                }}>
                  Come back on Saturday or Sunday for your
                  weekly reflection. You have{" "}
                  {stats.journalCount || 0} entries so far
                  this week.
                </div>
              ) : current?.reflection ? (
                <>
                  <div style={{
                    background: "#f1f0ea", borderRadius: 10,
                    padding: "14px 16px", marginBottom: 12,
                    fontSize: 12, lineHeight: 1.8, color: "#444"
                  }}>
                    {current.reflection}
                  </div>

                  {/* Suggested habit */}
                  {current.suggestedHabit && (
                    <div style={{
                      background: "#EEEDFE", borderRadius: 10,
                      padding: "12px 14px"
                    }}>
                      <div style={{
                        fontSize: 11, color: "#3C3489",
                        fontWeight: 500, marginBottom: 4
                      }}>
                        {view === "alltime"
                          ? "A habit to consider"
                          : "Suggested for next week"}
                      </div>
                      <div style={{
                        fontSize: 12, color: "#534AB7",
                        lineHeight: 1.5, marginBottom: 10
                      }}>
                        {current.suggestedHabit.reason}
                      </div>
                      <button
                        onClick={handleAddHabit}
                        disabled={addedHabit}
                        style={{
                          width: "100%", padding: "7px",
                          borderRadius: 8, border: "none",
                          background: addedHabit
                            ? "#aaa" : "#534AB7",
                          fontSize: 12, color: "#fff",
                          cursor: addedHabit
                            ? "not-allowed" : "pointer"
                        }}>
                        {addedHabit
                          ? `Added ✓`
                          : `Add "${current.suggestedHabit.name}"`}
                      </button>
                    </div>
                  )}

                  <div style={{
                    fontSize: 11, color: "#bbb", marginTop: 10
                  }}>
                    Based on {stats.journalCount ||
                    current.data?.journalCount || 0} entries
                    {view === "alltime" && current.data?.daysSince
                      ? ` over ${current.data.daysSince} days`
                      : ""}
                  </div>
                </>
              ) : (
                <div style={{
                  background: "#f1f0ea", borderRadius: 10,
                  padding: "14px 16px", fontSize: 12,
                  color: "#888", lineHeight: 1.7
                }}>
                  {view === "alltime"
                    ? "Start journaling and tracking habits to build up your all-time insights."
                    : "Keep journaling and checking off habits to build meaningful insights."}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <HandoffCard
          message={current?.suggestedHabit && !addedHabit
            ? "Want to add the suggested habit to your board?"
            : "Head back to your habit board to keep the momentum going."}
          buttonLabel="Go to habits"
          to="/habits"
          state={current?.suggestedHabit && !addedHabit
            ? { suggestedHabit: current.suggestedHabit.name }
            : {}}
        />
      </div>
    </div>
  );
}