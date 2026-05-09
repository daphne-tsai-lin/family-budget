import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

const col = collection(db, "expenses");

export const expenseService = {

  async create(data) {
    return await addDoc(col, data);
  },

  async list() {
    const snap = await getDocs(col);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
  },

  async remove(id) {
    return await deleteDoc(doc(db, "expenses", id));
  }

};
