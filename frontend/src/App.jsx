import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import Mindfulness from './pages/Mindfulness.jsx';
import HabitBoard from './pages/HabitBoard.jsx';
import Insight from './pages/Insight.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="journal"     element={<Journal />} />
        <Route path="mindfulness" element={<Mindfulness />} />
        <Route path="habits"      element={<HabitBoard />} />
        <Route path="insight"     element={<Insight />} />
      </Route>
    </Routes>
  );
}
