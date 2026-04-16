import { useRef, useEffect, useState } from "react";

export default function ChatWindow({
  messages = [],
  onSend,
  loading = false,
  placeholder = "Write a message...",
  disabled = false
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0
    }}>
      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "4px 0", marginBottom: 12
      }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "#bbb", padding: "8px 0" }}>
            Start the conversation...
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 8
          }}>
            <div style={{
              background: m.role === "user" ? "#1D9E75" : "#f1f0ea",
              color: m.role === "user" ? "#fff" : "#2c2c2a",
              borderRadius: m.role === "user"
                ? "12px 12px 3px 12px"
                : "12px 12px 12px 3px",
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
            padding: "9px 13px", fontSize: 12,
            color: "#aaa", display: "inline-block"
          }}>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        borderTop: "0.5px solid #e0e0d8", paddingTop: 10
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          disabled={disabled}
          style={{ flex: 1, borderRadius: 20 }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim() || disabled}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#1D9E75", border: "none",
            color: "#fff", fontSize: 16, padding: 0,
            display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0
          }}>
          →
        </button>
      </div>
    </div>
  );
}