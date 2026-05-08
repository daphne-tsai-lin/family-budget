import { useMemo } from "react";
import ExpenseItem from "./ExpenseItem";

export default function ExpenseList({ expenses }) {

  /*
  防止 Firestore 還沒回傳資料
  */

  if (!expenses) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        載入資料中...
      </div>
    );
  }

  /*
  沒有資料
  */

  if (expenses.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
        尚未新增任何記帳
      </div>
    );
  }

  /*
  使用 useMemo 避免每次 render 重新排序
  */

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  }, [expenses]);

  return (
    <div
      className="expense-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "10px"
      }}
    >
      {sortedExpenses.map((expense) => (
        <ExpenseItem
          key={expense.id}
          expense={expense}
        />
      ))}
    </div>
  );

}
