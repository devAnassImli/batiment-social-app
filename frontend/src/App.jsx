import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TotemLogin from './pages/TotemLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import RouteProtegee from './components/RouteProtegee';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TotemLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <RouteProtegee>
              <AdminDashboard />
            </RouteProtegee>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;