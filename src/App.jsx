import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Register from "./pages/Register";
import RegisterVehicle from "./pages/RegisterVehicle";
import OBD2 from "./pages/OBD2";
import MarkTrip from "./pages/MarkTrip";
import Repairs from "./pages/Repairs";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal */}
        <Route path="/" element={<Login />} />

        {/* Registro */}
        <Route path="/register" element={<Register />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Historial */}
        <Route path="/history" element={<History />} />

        {/* OBD2 */}
        <Route path="/obd2" element={<OBD2 />} />

        {/* Registrar vehículo */}
        <Route path="/register-vehicle" element={<RegisterVehicle />} />

        {/* Marcar viaje */}
        <Route path="/mark-trip" element={<MarkTrip />} />

        {/* Reparaciones */}
        <Route path="/repairs" element={<Repairs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;