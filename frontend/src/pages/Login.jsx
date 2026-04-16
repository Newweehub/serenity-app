import { useState }  from "react";
import { login }     from "../services/api";
import { useUser }   from "../context/UserContext";

export default function Login() {
  const { handleLogin }   = useUser();
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const user = await login(name.trim());
      handleLogin(user);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#f9f9f7"
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #e0e0d8",
        borderRadius: 16, padding: "40px 36px", width: 340
      }}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: 10, marginBottom: 8
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#1D9E75", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="3"
                      stroke="#fff" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="6"
                      stroke="#fff" strokeWidth="1"
                      strokeDasharray="2 2"/>
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 500 }}>Serenity</span>
        </div>
        <p style={{
          fontSize: 13, color: "#888",
          marginBottom: 24, lineHeight: 1.6
        }}>
          Your AI mindfulness and journaling companion.
          Enter your name to begin.
        </p>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{ marginBottom: 12 }}
        />
        {error && (
          <p style={{
            fontSize: 12, color: "#E24B4A",
            marginBottom: 10
          }}>
            {error}
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          style={{
            width: "100%", padding: 10,
            background: "#1D9E75", border: "none",
            borderRadius: 8, color: "#fff",
            fontSize: 13, fontWeight: 500
          }}>
          {loading ? "Loading..." : "Let's begin →"}
        </button>
      </div>
    </div>
  );
}