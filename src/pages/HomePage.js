import ExpenseList from "../components/ExpenseList";
import { useExpenses } from "../hooks/useExpenses";

export default function HomePage() {

  const { expenses, loading } = useExpenses();

  if (loading) {

    return <div>Loading...</div>;

  }

  return (

    <div>

      <h2>家庭記帳</h2>

      <ExpenseList expenses={expenses} />

    </div>

  );

}
