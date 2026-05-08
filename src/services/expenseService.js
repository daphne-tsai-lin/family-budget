import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

const expenseCollection = collection(db, "expenses");

/*
即時監聽資料
*/

export const subscribeExpenses = (callback) => {

  const q = query(
    expenseCollection,
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snapshot) => {

    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    callback(expenses);

  });

};

/*
新增記帳
*/

export const addExpense = async (expense) => {

  return await addDoc(expenseCollection, {
    ...expense,
    createdAt: serverTimestamp()
  });

};

/*
刪除記帳
*/

export const deleteExpense = async (id) => {

  const ref = doc(db, "expenses", id);

  await deleteDoc(ref);

};
