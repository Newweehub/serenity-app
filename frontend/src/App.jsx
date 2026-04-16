import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import Sidebar     from "./components/Sidebar";
import TopBar      from "./components/TopBar";
import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import Journal     from "./pages/Journal";
import Mindfulness from "./pages/Mindfulness";
import Habits      from "./pages/Habits";
import Insights    from "./pages/Insights";

function AppShell() {
  const { user } = useUser();
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, display: "flex",
                      flexDirection: "column", minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/journal"     element={<Journal />} />
              <Route path="/mindfulness" element={<Mindfulness />} />
              <Route path="/habits"      element={<Habits />} />
              <Route path="/insights"    element={<Insights />} />
              <Route path="*"            element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  );
}