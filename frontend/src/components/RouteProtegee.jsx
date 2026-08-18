import { Navigate } from 'react-router-dom';

export default function RouteProtegee({ children }) {
  const token = sessionStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}