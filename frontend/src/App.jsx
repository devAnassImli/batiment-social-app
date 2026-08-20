import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TotemLogin from './pages/TotemLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminSignalementDetail from './pages/AdminSignalementDetail';
import RouteProtegee from './components/RouteProtegee';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TotemLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={<RouteProtegee><AdminDashboard /></RouteProtegee>}
        />
        <Route
          path="/admin/signalement/:id"
          element={<RouteProtegee><AdminSignalementDetail /></RouteProtegee>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;