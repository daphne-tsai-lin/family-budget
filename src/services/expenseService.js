import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";

const expenseCollection = collection(db, "expenses");

export const getExpenses = async () => {

  const q = query(
    expenseCollection,
    orderBy("date", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const addExpense = async (expense) => {

  return await addDoc(expenseCollection, {
    ...expense,
    createdAt: serverTimestamp()
  });

};

export const deleteExpense = async (id) => {

  const ref = doc(db, "expenses", id);

  await deleteDoc(ref);

};
