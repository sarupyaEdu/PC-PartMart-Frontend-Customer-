import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("customerToken");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
