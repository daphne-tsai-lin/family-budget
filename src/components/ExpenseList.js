import ExpenseItem from "./ExpenseItem";

export default function ExpenseList({ expenses }) {

  return (
    <div>

      {expenses.map(exp => (

        <ExpenseItem
          key={exp.id}
          expense={exp}
        />

      ))}

    </div>
  );
}
