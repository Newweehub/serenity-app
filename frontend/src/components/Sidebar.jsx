import { NavLink } from "react-router-dom";
import { useUser } from "../context/UserContext";

const NAV = [
  { path: "/",            label: "Dashboard"   },
  { path: "/journal",     label: "Journal"     },
  { path: "/mindfulness", label: "Mindfulness" },
  { path: "/habits",      label: "Habit board" },
  { path: "/insights",    label: "Insights"    }
];

export default function Sidebar() {
  const { user, handleLogout } = useUser();

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: "#f1f0ea",
      borderRight: "0.5px solid #e0e0d8",
      display: "flex", flexDirection: "column",
      minHeight: "100vh"
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 16px 18px",
        borderBottom: "0.5px solid #e0e0d8"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#1D9E75", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="3"
                      stroke="#fff" strokeWidth="1.5"/>
              <circle cx="7" cy="7" r="5.5"
                      stroke="#fff" strokeWidth="1"
                      strokeDasharray="2 2"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Serenity</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {NAV.map(({ path, label }) => (
          <NavLink key={path} to={path} end={path === "/"}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center",
              gap: 10, padding: "9px 16px",
              fontSize: 13, color: isActive ? "#1D9E75" : "#888",
              fontWeight: isActive ? 500 : 400,
              background: isActive ? "#fff" : "transparent",
              borderRight: isActive
                ? "2px solid #1D9E75" : "2px solid transparent",
              transition: "all 0.15s"
            })}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "currentColor", flexShrink: 0
            }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: "12px 16px",
        borderTop: "0.5px solid #e0e0d8"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#E1F5EE", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 500, color: "#085041",
            flexShrink: 0
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: "#aaa" }}>
              {user?.streakDays || 0} day streak
            </div>
          </div>
          <button onClick={handleLogout} style={{
            fontSize: 11, color: "#bbb", background: "none",
            border: "none", padding: 0, flexShrink: 0
          }}>
            out
          </button>
        </div>
      </div>
    </div>
  );
}