import { useEffect, useState } from "react";
import { expenseService } from "../domains/expense/expenseService";

export default function ExpensePage() {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    const data = await expenseService.list();
    setExpenses(data);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>記帳列表</h1>

      {expenses.length === 0 && <p>目前沒有記帳資料</p>}

      {expenses.map((e) => (
        <div key={e.id}>
          {e.category} - {e.amount}
        </div>
      ))}
    </div>
  );
}
