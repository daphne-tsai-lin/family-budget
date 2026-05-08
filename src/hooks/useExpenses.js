import { useState, useEffect } from "react";
import { subscribeExpenses } from "../services/expenseService";

export const useExpenses = () => {

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = subscribeExpenses((data) => {

      setExpenses(data);

      setLoading(false);

    });

    return () => unsubscribe();

  }, []);

  return {
    expenses,
    loading
  };

};
