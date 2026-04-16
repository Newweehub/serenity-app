import { useUser } from "../context/UserContext";

export default function TopBar() {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning"
                 : hour < 17 ? "Good afternoon"
                 : "Good evening";
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric"
  });

  return (
    <div style={{
      padding: "14px 24px",
      borderBottom: "0.5px solid #e0e0d8",
      background: "#fff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0
    }}>
      <div style={{ fontSize: 15, fontWeight: 500 }}>
        {greeting}, {user?.name}
      </div>
      <div style={{ fontSize: 12, color: "#aaa" }}>{date}</div>
    </div>
  );
}