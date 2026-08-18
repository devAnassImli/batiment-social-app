import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TotemLogin from './pages/TotemLogin';
import AdminLogin from './pages/AdminLogin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TotemLogin />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<div style={{padding: 40}}>Dashboard admin - à construire</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;