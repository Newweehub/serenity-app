import { useState, useEffect } from "react";
import { useUser }             from "../context/UserContext";
import { getInsights, getStats } from "../services/api";

export default function Insights() {
  const { user }                  = useUser();
  const [insight, setInsight]     = useState(null);
  const [stats,   setStats]       = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      getInsights(user.userId),
      getStats(user.userId)
    ]).then(([ins, st]) => {
      setInsight(ins);
      setStats(st);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [user.userId]);

  if (loading) return (
    <div style={{ fontSize: 13, color: "#aaa", padding: 8 }}>
      Loading your insights...
    </div>
  );

  // Compute habit completion %
  const completionPct = stats?.habitStats?.length
    ? Math.round(
        (stats.habitStats.reduce((a, h) => a + h.completed, 0) /
         (stats.habitStats.length * 7)) * 100
      )
    : 0;

  // Top 3 emotions for chart
  const topEmotions = Object.entries(stats?.emotions || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxCount = topEmotions[0]?.[1] || 1;

  const EMOTION_COLORS = ["#1D9E75", "#EF9F27", "#534AB7"];

  return (
    <div>
      {/* Metric cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: 10, marginBottom: 16
      }}>
        {[
          { val: stats?.journalCount || 0,
            label: "journal entries",  color: "#534AB7" },
          { val: `${completionPct}%`,
            label: "habit completion", color: "#1D9E75" },
          { val: stats?.habitStats?.length || 0,
            label: "active habits",    color: "#1D9E75" },
          { val: stats?.topEmotion || "—",
            label: "top emotion",      color: "#D4537E" }
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
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
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
        {/* Mood chart */}
        <div style={{
          background: "#fff", border: "0.5px solid #e0e0d8",
          borderRadius: 12, padding: 16
        }}>
          <div style={{
            fontSize: 13, fontWeight: 500, marginBottom: 14
          }}>
            Mood this week
          </div>
          {topEmotions.length === 0 ? (
            <div style={{ fontSize: 12, color: "#bbb" }}>
              No mood data yet — write some journal entries!
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
                  background: EMOTION_COLORS[i],
                  width: `${Math.round((count / maxCount) * 100)}%`,
                  transition: "width 0.5s"
                }} />
              </div>
              <div style={{
                fontSize: 11, color: "#aaa",
                width: 48, flexShrink: 0, textAlign: "right"
              }}>
                {count} day{count !== 1 ? "s" : ""}
              </div>
            </div>
          ))}

          {/* Habit stats */}
          {stats?.habitStats?.length > 0 && (
            <>
              <div style={{
                fontSize: 12, fontWeight: 500,
                marginTop: 16, marginBottom: 10,
                paddingTop: 12,
                borderTop: "0.5px solid #e0e0d8"
              }}>
                Habit completion
              </div>
              {stats.habitStats.map((h, i) => {
                const pct = Math.round((h.completed / h.total) * 100);
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
                      width: 32, flexShrink: 0,
                      textAlign: "right"
                    }}>
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* AI weekly reflection */}
        <div style={{
          background: "#fff", border: "0.5px solid #e0e0d8",
          borderRadius: 12, padding: 16
        }}>
          <div style={{
            fontSize: 13, fontWeight: 500, marginBottom: 14
          }}>
            AI weekly reflection
          </div>
          {insight?.reflection ? (
            <>
              <div style={{
                background: "#f1f0ea", borderRadius: 10,
                padding: "14px 16px", marginBottom: 12,
                fontSize: 12, lineHeight: 1.8, color: "#444"
              }}>
                {insight.reflection}
              </div>
              <div style={{ fontSize: 11, color: "#bbb" }}>
                Based on {stats?.journalCount || 0} journal entries
                and {stats?.habitStats?.length || 0} active habits
                this week
              </div>
            </>
          ) : (
            <div style={{
              background: "#f1f0ea", borderRadius: 10,
              padding: "14px 16px", fontSize: 12,
              color: "#aaa", lineHeight: 1.7
            }}>
              Write a few journal entries and check off some habits
              this week — your AI reflection will appear here each
              Sunday.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}