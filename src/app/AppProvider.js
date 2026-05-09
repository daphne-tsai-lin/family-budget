import { AuthProvider } from "../store/AuthContext";

export default function AppProvider({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
