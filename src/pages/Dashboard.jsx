import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaCar } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';

import './Dashboard.css';

function Dashboard() {

  const [vehicles, setVehicles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');

        // USAMOS LA VARIABLE DE ENTORNO EN LUGAR DE LOCALHOST
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/vehicles/my`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await res.json();
        setVehicles(data.vehicles || []);

      } catch (error) {
        console.log(error);
      }
    };

    fetchVehicles();
  }, []);

  return (

    <div className="dashboard-container">

      <Sidebar activePage="dashboard" />

      {/* Main */}
      <div className="main-content">

        <div className="topbar">

          <h1>
            Dashboard Vehicular
          </h1>

          <p>
            Bienvenido al sistema inteligente OBD-II
          </p>

        </div>

        {/* Stats */}
        <div className="stats-grid">

          <div className="stat-card">

            <h2>{vehicles.length}</h2>

            <p>Autos Registrados</p>

          </div>

          <div className="stat-card">

            <h2>12</h2>

            <p>Viajes Realizados</p>

          </div>

          <div className="stat-card">

            <h2>4</h2>

            <p>Códigos Detectados</p>

          </div>

          <div className="stat-card">

            <h2>98%</h2>

            <p>Estado General</p>

          </div>

        </div>

        {/* Vehículos */}
        <div className="section">

          <h2 className="section-title">
            Mis Vehículos
          </h2>

          {vehicles.length === 0 ? (

            <div className="empty-card">
              No tienes autos registrados
            </div>

          ) : (

            <div className="vehicle-grid">

              {vehicles.map((v) => (

                <div
                  key={v._id}
                  className="vehicle-card"
                >

                  <div className="vehicle-icon">
                    <FaCar />
                  </div>

                  <h3>{v.model}</h3>

                  <p>Año: {v.year}</p>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;