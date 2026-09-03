import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TotemLogin from './pages/TotemLogin';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import RouteProtegee from './components/RouteProtegee';
import AdminReferentiels from './pages/AdminReferentiels';
import AdminStatistiques from './pages/AdminStatistiques';

function App() {
  return (
    <BrowserRouter basename="/totem_bs">
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

        <Route
          path="/admin/referentiels"
          element={
            <RouteProtegee>
              <AdminReferentiels />
            </RouteProtegee>
          }
        />

        <Route
          path="/admin/statistiques"
          element={
            <RouteProtegee>
              <AdminStatistiques />
            </RouteProtegee>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;