import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>記帳 App</h1>

      <p>歡迎使用記帳系統</p>

      <Link to="/expenses">
        <button>進入記帳</button>
      </Link>
    </div>
  );
}
