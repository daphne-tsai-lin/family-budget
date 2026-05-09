import { Routes, Route } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import ExpensePage from "../pages/ExpensePage";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/expenses" element={<ExpensePage />} />
    </Routes>
  );
}
