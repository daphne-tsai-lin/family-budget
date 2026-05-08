import { useState, useEffect } from "react";
import { getExpenses } from "../services/expenseService";

export const useExpenses = () => {

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {

    const data = await getExpenses();

    setExpenses(data);

    setLoading(false);
  };

  useEffect(() => {

    loadExpenses();

  }, []);

  return {
    expenses,
    loading,
    reload: loadExpenses
  };

};
