import { useState, useEffect, useRef } from "react";
import { useLocation }                 from "react-router-dom";
import { useUser }                     from "../context/UserContext";
import HandoffCard                     from "../components/HandoffCard";
import { markStepDone }                from "../utils/journey";
import { sendMessage, addHabit }       from "../services/api";

export default function Mindfulness() {
  const { user }                        = useUser();
  const location                        = useLocation();

  // Safe null check for location.state
  const incomingMood = location?.state?.mood || "neutral";
  const fromJournal  = location?.state?.fromJournal || false;

  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [sessionDone,  setSessionDone]  = useState(false);
  const [exerciseName, setExerciseName] = useState(null);
  const [added,        setAdded]        = useState(false);
  const [started,      setStarted]      = useState(false);
  const bottomRef                       = useRef(null);
  const [savedExercises, setSavedExercises] = useState([]);

  useEffect(() => {
    // Auto-start if coming from journal with a mood
    if (fromJournal && incomingMood && incomingMood !== "neutral") {
      startSession();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    getMindfulnessHabits(user.userId)
      .then(setSavedExercises)
      .catch(() => {});
  }, [user.userId]);
  

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startSession = async () => {
    if (started) return;
    setStarted(true);
    setLoading(true);
    try {
      // Don't show user message if auto-starting from journal
      // Just silently send mood context to the agent
      const triggerMessage = fromJournal
        ? `The user just finished journaling and was feeling ${incomingMood}. Start a suitable mindfulness exercise immediately without asking about their mood again.`
        : `Start a general mindfulness session for someone feeling ${incomingMood}.`;

      const res = await sendMessage(
        user.userId,
        triggerMessage,
        incomingMood,
        []
      );
      const content  = res?.response?.content || "";
      const exercise = res?.response?.exercise;
      if (exercise) setExerciseName(exercise);
      markStepDone(user.userId, "Mindfulness");
      setMessages([{ role: "ai", content }]);
    } catch (err) {
      console.error("Mindfulness start error:", err);
      setMessages([{
        role:    "ai",
        content: "Let's take a moment to breathe together."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (text) => {
    if (!text.trim() || loading || sessionDone) return;
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const saidYes = /\b(yes|yeah|sure|ok|okay|add it|please|yep)\b/i
        .test(text);
      const saidNo  = /\b(no|nope|not now|skip|maybe later)\b/i
        .test(text);

      // Handle yes/no to adding habit
      if (saidYes && exerciseName && !added) {
        await addHabit(
          user.userId,
          `Daily ${exerciseName}`,
          "mindfulness"
        );
        setAdded(true);
        setSessionDone(true);
        setMessages(m => [...m, {
          role:    "ai",
          content: `"Daily ${exerciseName}" has been added to your habit board. You're doing great — see you tomorrow!`
        }]);
        setLoading(false);
        return;
      }

      if (saidNo && exerciseName && !added) {
        setSessionDone(true);
        setMessages(m => [...m, {
          role:    "ai",
          content: "No problem! The option will always be there when you're ready. Take care."
        }]);
        setLoading(false);
        return;
      }

      // Normal conversation
      const history = messages.map(m => ({
        role:    m.role === "ai" ? "assistant" : "user",
        content: m.content
      }));
      const res  = await sendMessage(user.userId, text, null, history);
      const data = res?.response || {};

      if (data.exercise)  setExerciseName(data.exercise);
      if (data.completed) {
        // Exercise complete — prompt for habit
        setMessages(m => [...m, {
          role:    "ai",
          content: (data.content || "") +
            (data.content ? "" :
              " Great work! Would you like to add this exercise to your daily habit board?")
        }]);
        setLoading(false);
        return;
      }

      if (data.content) {
        setMessages(m => [...m, {
          role: "ai", content: data.content
        }]);
      }

    } catch (err) {
      console.error("Mindfulness chat error:", err);
      setMessages(m => [...m, {
        role:    "ai",
        content: "Let's continue — take a deep breath and try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const [inputValue, setInputValue] = useState("");

  const startSessionWithExercise = async (exerciseName) => {
  if (started) return;
  setStarted(true);
  setLoading(true);
  setExerciseName(exerciseName);
  try {
    const res = await sendMessage(
      user.userId,
      `Please guide me through ${exerciseName} right now.`,
      incomingMood,
      []
    );
    const content = res?.response?.content || "";
    markStepDone(user.userId, "Mindfulness");
    setMessages([{ role: "ai", content }]);
  } catch {
    setMessages([{
      role:    "ai",
      content: `Let's begin ${exerciseName}. Find a comfortable position and we'll start.`
    }]);
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 112px)"
    }}>

      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12, flexShrink: 0
      }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          Mindfulness session
          {fromJournal && (
            <span style={{
              fontSize: 11, color: "#aaa",
              fontWeight: 400, marginLeft: 8
            }}>
              from journal
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {exerciseName && (
            <span style={{
              padding: "2px 10px", borderRadius: 10,
              background: "#E1F5EE", color: "#085041",
              fontSize: 11, fontWeight: 500
            }}>
              {exerciseName}
            </span>
          )}
          {added && (
            <span style={{
              padding: "2px 10px", borderRadius: 10,
              background: "#E1F5EE", color: "#1D9E75",
              fontSize: 11, fontWeight: 500
            }}>
              Added to habits ✓
            </span>
          )}
        </div>
      </div>

      {/* Main chat card */}
      <div style={{
        flex: 1, background: "#fff",
        border: "0.5px solid #e0e0d8",
        borderRadius: 12, padding: 16,
        display: "flex", flexDirection: "column",
        minHeight: 0
      }}>
        {!started ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", gap: 16
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: "50%",
              background: "#E1F5EE", border: "2px solid #1D9E75",
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, color: "#1D9E75"
            }}>
              ✦
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                {fromJournal
                  ? `Based on your journal, let's do a session for feeling ${incomingMood}`
                  : "Ready to begin?"}
              </div>
              <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
                {fromJournal
                  ? "Your mindfulness session has been prepared based on what you shared."
                  : "Coach Luna will guide you through a mindfulness session."}
              </div>
            </div>
            <button onClick={startSession} style={{
              padding: "10px 28px", borderRadius: 24,
              background: "#1D9E75", border: "none",
              color: "#fff", fontSize: 13,
              cursor: "pointer", fontWeight: 500
            }}>
              Begin →
            </button>
          </div>
        ) : (
          <>
            {/* Messages — scrollable */}
            <div style={{
              flex: 1, overflowY: "auto",
              minHeight: 0, marginBottom: 12,
              paddingRight: 4
            }}>
              <div style={{
                fontSize: 11, color: "#bbb",
                marginBottom: 12
              }}>
                Coach Luna · {incomingMood} mood
              </div>

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
                    maxWidth: "82%"
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
                  ...
                </div>
              )}

              {sessionDone && (
                <div style={{
                  textAlign: "center",
                  padding: "12px 0",
                  color: "#aaa", fontSize: 11
                }}>
                  ── Session complete ──
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!sessionDone ? (
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
                    e.key === "Enter" && handleSend(inputValue)
                      && setInputValue("")}
                  placeholder="Follow along or ask a question..."
                  style={{ flex: 1, borderRadius: 20 }}
                />
                <button
                  onClick={() => {
                    handleSend(inputValue);
                    setInputValue("");
                  }}
                  disabled={loading || !inputValue.trim()}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#1D9E75", border: "none",
                    color: "#fff", fontSize: 16,
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center",
                    justifyContent: "center"
                  }}>
                  →
                </button>
              </div>
            ) : (
              <div style={{
                borderTop: "0.5px solid #e0e0d8",
                paddingTop: 10, flexShrink: 0,
                fontSize: 12, color: "#aaa",
                textAlign: "center"
              }}>
                Session complete — head to your habit board
              </div>
            )}
          </>
        )}
      </div>

      {/* Saved exercises from habit board */}
      {savedExercises.length > 0 && !started && (
        <div style={{
          background: "#fff", border: "0.5px solid #e0e0d8",
          borderRadius: 12, padding: 16, marginTop: 12,
          flexShrink: 0
        }}>
          <div style={{
            fontSize: 12, fontWeight: 500,
            color: "#aaa", marginBottom: 10
          }}>
            Your saved exercises
          </div>
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap"
          }}>
            {savedExercises.map((h, i) => (
              <button key={i}
                onClick={() => {
                  // Start session with this specific exercise
                  setStarted(false);
                  startSessionWithExercise(h.name);
                }}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: "0.5px solid #9FE1CB",
                  background: "#E1F5EE", color: "#085041",
                  fontSize: 12, cursor: "pointer"
                }}>
                {h.name.replace("Daily ", "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Handoff card — outside the chat card */}
      <div style={{ marginTop: 12, flexShrink: 0 }}>
        <HandoffCard
          message={added
            ? `"Daily ${exerciseName}" is on your board. Keep the momentum going!`
            : sessionDone
              ? "Session done. Head to your habit board to check in."
              : "When you're ready, continue to your habit board."}
          buttonLabel="Go to habits"
          to="/habits"
          state={{ suggestedHabit: exerciseName }}
        />
      </div>
    </div>
  );
}