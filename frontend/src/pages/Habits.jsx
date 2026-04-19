import { useState, useEffect }          from "react";
import { useLocation }                  from "react-router-dom";
import { useUser }                      from "../context/UserContext";
import HandoffCard                      from "../components/HandoffCard";
import { markStepDone }                 from "../utils/journey";
import { getHabits, addHabit, checkOffHabit,
         sendMessage }  from "../services/api";

export default function Habits() {
  const [respondingTo, setRespondingTo] = useState(null);
  const [shorterVersion, setShorterVersion] = useState(null);
  const { user }                        = useUser();
  const location                        = useLocation();
  const suggestedHabit = location.state?.suggestedHabit || null;

  const [habits,       setHabits]       = useState([]);
  const [newHabit,     setNewHabit]     = useState("");
  const [notifications, setNotifications] = useState([]);
  const [addedSuggestion, setAddedSuggestion] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadHabits();
  }, [user.userId]);

  const loadHabits = async () => {
    try {
      const data = await getHabits(user.userId);
      setHabits(data);
      checkMissedHabits(data);
    } catch {}
  };

  // Check which habits were missed yesterday
  const checkMissedHabits = (habitList) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split("T")[0];

    const missed = habitList.filter(h =>
      h.active &&
      h.createdAt?.split("T")[0] <= yd &&
      !h.completedDates?.includes(yd)
    );

    if (missed.length > 0) {
      setNotifications(missed.map(h => ({
        type:      "missed",
        habitId:   h.id,
        habitName: h.name,
        message:   `You missed "${h.name}" yesterday. Want to try a shorter version today?`
      })));
    }
  };

  const handleCheck = async (habitId, habitName) => {
    try {
      const updated = await checkOffHabit(user.userId, habitId);
      setHabits(h => h.map(x => x.id === habitId ? updated : x));

      // Show inline celebration
      setNotifications(n => [
        ...n.filter(x => x.habitId !== habitId),
        {
          type:      "done",
          habitId,
          habitName,
          message:   `"${habitName}" done for today! Streak: ${updated.streak} days`
        }
      ]);

      // Auto-dismiss celebration after 4 seconds
      setTimeout(() => {
        setNotifications(n => n.filter(x =>
          !(x.habitId === habitId && x.type === "done")
        ));
      }, 4000);

      //after successful checkOffHabit:
      markStepDone(user.userId, "Habits");

    } catch {}
  };

  const handleAddHabit = async (name) => {
    if (!name.trim()) return;
    try {
      const habit = await addHabit(user.userId, name.trim());
      setHabits(h => [habit, ...h]);
      setNewHabit("");
    } catch {}
  };

  const handleAddSuggestion = async () => {
    if (!suggestedHabit || addedSuggestion) return;
    await handleAddHabit(suggestedHabit);
    setAddedSuggestion(true);
  };

  const dismissNotification = (habitId) => {
    setNotifications(n => n.filter(x => x.habitId !== habitId));
  };

  const doneToday    = habits.filter(h =>
    h.completedDates?.includes(today)).length;
  const totalHabits  = habits.length;

  const handleMissedResponse = async (habitId, habitName, accepted) => {
    if (!accepted) {
      // User said no — just dismiss
      dismissNotification(habitId);
      return;
    }

    // User said yes — get a shorter version from the habit agent
    setRespondingTo(habitId);
    try {
      // Get coaching message from habit agent
      const res = await sendMessage(
        user.userId,
        `I missed my "${habitName}" habit yesterday. I want to try a shorter version today.`,
      null, []
      );
      const content = res?.response?.content ||
      `Try a quick 1-minute version of "${habitName}" — it still counts!`;
      setShorterVersion(content);

      // Check off the habit for today with a shorter version
      // This updates the streak and today's completedDates
      try {
        const updated = await checkOffHabit(user.userId, habitId);
        // Refresh habits list so the board updates
        setHabits(h => h.map(x => x.id === habitId ? updated : x));
        markStepDone(user.userId, "Habits");
      } catch (checkErr) {
        console.warn("Could not check off habit:", checkErr.message);
      }
    } catch {
      setShorterVersion(
        `No problem! Try a quick 1-minute version of "${habitName}" today — it still counts toward your streak.`
      );
    }
  };

  return (
    <div>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {notifications.map((n, i) => (
            <div key={i} style={{
              borderRadius: 10, marginBottom: 8,
              border: `0.5px solid ${
                n.type === "done"   ? "#9FE1CB" :
                n.type === "missed" ? "#FAC775" : "#e0e0d8"}`,
              overflow: "hidden"
            }}>
              {/* Main notification row */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: n.type === "done"
                  ? "#E1F5EE" : "#FAEEDA"
              }}>
                <div style={{
                  fontSize: 12, lineHeight: 1.5,
                  color: n.type === "done" ? "#085041" : "#633806",
                  flex: 1
                }}>
                  {n.message}
                </div>

                <div style={{
                  display: "flex", gap: 6,
                  alignItems: "center", flexShrink: 0,
                  marginLeft: 10
                }}>
                  {n.type === "missed" && respondingTo !== n.habitId && (
                    <>
                      <button
                        onClick={() => handleMissedResponse(
                          n.habitId, n.habitName, true
                        )}
                        style={{
                          padding: "4px 12px", borderRadius: 16,
                          background: "#1D9E75", border: "none",
                          fontSize: 11, color: "#fff",
                          cursor: "pointer"
                        }}>
                        Yes
                      </button>
                      <button
                        onClick={() => handleMissedResponse(
                          n.habitId, n.habitName, false
                        )}
                        style={{
                          padding: "4px 12px", borderRadius: 16,
                          background: "transparent",
                          border: "0.5px solid #FAC775",
                          fontSize: 11, color: "#854F0B",
                          cursor: "pointer"
                        }}>
                        Not today
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => dismissNotification(n.habitId)}
                    style={{
                      fontSize: 12, color: "#bbb",
                      background: "none", border: "none",
                      cursor: "pointer", padding: 0
                    }}>
                 ✕
               </button>
             </div>
           </div>

           {/* Expanded response — shown after clicking Yes */}
           {respondingTo === n.habitId && shorterVersion && (
             <div style={{
               padding: "10px 14px",
               background: "#fff",
               borderTop: "0.5px solid #FAC775"
             }}>
               <div style={{
                 fontSize: 12, color: "#444",
                 lineHeight: 1.6, marginBottom: 8
               }}>
                 {shorterVersion}
               </div>
               <button
                  onClick={async () => {
                    setRespondingTo(null);
                    setShorterVersion(null);
                    dismissNotification(n.habitId);
                    // Reload habits to show updated state
                    try {
                      const fresh = await getHabits(user.userId);
                      setHabits(fresh);
                    } catch {}
                  }}
                  style={{
                    padding: "5px 14px", borderRadius: 16,
                    background: "#1D9E75", border: "none",
                    fontSize: 11, color: "#fff", cursor: "pointer"
                  }}>
                  Got it, I'll try that
                </button>
             </div>
           )}
         </div>
       ))}
     </div>
    )}

      {/* Suggested habit from mindfulness/insights */}
      {suggestedHabit && !addedSuggestion && (
        <div style={{
          background: "#EEEDFE", borderRadius: 10,
          padding: "12px 14px", marginBottom: 14,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10
        }}>
          <div style={{ fontSize: 12, color: "#3C3489", flex: 1 }}>
            Add "{suggestedHabit}" to your habit board?
          </div>
          <button onClick={handleAddSuggestion} style={{
            padding: "6px 14px", borderRadius: 20,
            background: "#534AB7", border: "none",
            fontSize: 11, color: "#fff", cursor: "pointer",
            flexShrink: 0
          }}>
            Add it
          </button>
        </div>
      )}

      {/* Header + Add input */}
      <div style={{
        background: "#fff", border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              My habit board
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
              {doneToday} of {totalHabits} done today
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              onKeyDown={e =>
                e.key === "Enter" && handleAddHabit(newHabit)}
              placeholder="New habit..."
              style={{
                width: 150, borderRadius: 20,
                padding: "5px 12px", fontSize: 12
              }}
            />
            <button
              onClick={() => handleAddHabit(newHabit)}
              disabled={!newHabit.trim()}
              style={{
                padding: "5px 14px", borderRadius: 20,
                background: "#1D9E75", border: "none",
                fontSize: 11, color: "#fff",
                cursor: "pointer", whiteSpace: "nowrap"
              }}>
              + Add
            </button>
          </div>
        </div>

        {habits.length === 0 && (
          <div style={{
            fontSize: 12, color: "#bbb",
            padding: "20px 0", textAlign: "center"
          }}>
            No habits yet — add one above or complete a
            mindfulness session first.
          </div>
        )}

        {/* Habit list */}
        {habits.map(h => {
          const doneFlag = h.completedDates?.includes(today);
          const weekDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split("T")[0];
          });
          const weekDone = h.completedDates?.filter(
            d => weekDates.includes(d)
          ).length || 0;
          const pct = Math.round((weekDone / 7) * 100);

          return (
            <div key={h.id} style={{
              display: "flex", alignItems: "center",
              gap: 12, padding: "12px 0",
              borderBottom: "0.5px solid #e0e0d8"
            }}>
              {/* Check circle */}
              <div
                onClick={() =>
                  !doneFlag && handleCheck(h.id, h.name)}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `1.5px solid ${doneFlag
                    ? "#1D9E75" : "#e0e0d8"}`,
                  background: doneFlag ? "#1D9E75" : "transparent",
                  cursor:     doneFlag ? "default" : "pointer",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                  transition: "all 0.2s"
                }}>
                {doneFlag && (
                  <svg width="11" height="11" fill="none"
                       viewBox="0 0 10 10">
                    <path d="M2 5l2.5 2.5L8 3"
                          stroke="#fff" strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Habit info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 5
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: doneFlag
                      ? "#aaa" : "var(--color-text-primary)",
                    textDecoration: doneFlag
                      ? "line-through" : "none"
                  }}>
                    {h.name}
                  </div>
                  <div style={{
                    display: "flex", gap: 8,
                    alignItems: "center"
                  }}>
                    <span style={{
                      fontSize: 11, color: "#aaa"
                    }}>
                      {h.streak} day streak
                    </span>
                    <span style={{
                      padding: "1px 8px", borderRadius: 8,
                      fontSize: 10, fontWeight: 500,
                      background: doneFlag ? "#E1F5EE" : "#f1f0ea",
                      color: doneFlag ? "#085041" : "#aaa"
                    }}>
                      {doneFlag ? "Done today" : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Weekly progress bar */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8
                }}>
                  <div style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: "#e0e0d8", overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      background: "#1D9E75",
                      width: `${pct}%`,
                      transition: "width 0.3s"
                    }} />
                  </div>
                  <span style={{
                    fontSize: 10, color: "#aaa",
                    whiteSpace: "nowrap"
                  }}>
                    {weekDone}/7 this week
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Handoff card */}
      <HandoffCard
        message={doneToday >= totalHabits && totalHabits > 0
          ? "All habits done for today! Check your weekly insights."
          : "Come back tomorrow to keep your streaks going."}
        buttonLabel="See insights"
        to="/insights"
        state={{}}
      />
    </div>
  );
}