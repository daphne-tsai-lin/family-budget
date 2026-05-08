export default function ExpenseItem({ expense }) {

  return (

    <div className="expense-item">

      <div>{expense.category}</div>

      <div>{expense.amount}</div>

      <div>{expense.date}</div>

      <div>{expense.note}</div>

    </div>

  );

}
