import { useNavigate } from "react-router-dom";

export default function HandoffCard({ message, buttonLabel, to, state }) {
  const navigate = useNavigate();
  if (!message) return null;

  return (
    <div style={{
      marginTop: 20, background: "#E1F5EE",
      borderRadius: 12, padding: "14px 16px",
      display: "flex", justifyContent: "space-between",
      alignItems: "center", gap: 12
    }}>
      <div style={{
        fontSize: 12, color: "#085041",
        lineHeight: 1.6, flex: 1
      }}>
        {message}
      </div>
      <button
        onClick={() => navigate(to, { state })}
        style={{
          padding: "7px 16px", borderRadius: 20,
          background: "#1D9E75", border: "none",
          fontSize: 12, color: "#fff",
          whiteSpace: "nowrap", flexShrink: 0
        }}>
        {buttonLabel} →
      </button>
    </div>
  );
}