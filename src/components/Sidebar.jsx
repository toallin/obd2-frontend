import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCar,
  FaMapMarkedAlt,
  FaCode,
  FaTachometerAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaHistory,
  FaWrench,
  FaBluetooth,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import './Sidebar.css';

function Sidebar({ activePage }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer state
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.warn('No se pudo obtener el perfil');
          if (res.status === 401) {
            localStorage.removeItem('token');
            navigate('/');
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false); // Close sidebar on mobile
  };

  // Mostrar loading mientras se carga el perfil
  if (loading) {
    return (
      <div className="sidebar">
        <div className="logo">OBD-II</div>
        <div className="profile">
          <FaUserCircle className="profile-icon" />
          <div>
            <h3>Cargando...</h3>
            <p>Sistema Vehicular</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Toggle Button for Mobile */}
      <button 
        className={`mobile-toggle-btn ${isOpen ? 'sidebar-open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Backdrop overlay for closing the sidebar when clicking outside */}
      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)}></div>}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="logo">OBD-II</div>

          <div className="profile">
            <FaUserCircle className="profile-icon" />
            <div>
              <h3>{user?.email || 'Usuario'}</h3>
              <p>Sistema Vehicular</p>
            </div>
          </div>

          <div className="menu">
            <button
              className={`menu-item ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavigate('/dashboard')}
            >
              <FaTachometerAlt />
              <span>Dashboard</span>
            </button>

            <button
              className={`menu-item ${activePage === 'register-vehicle' ? 'active' : ''}`}
              onClick={() => handleNavigate('/register-vehicle')}
            >
              <FaCar />
              <span>Registrar Auto</span>
            </button>

            <button
              className={`menu-item ${activePage === 'conexion' ? 'active' : ''}`}
              onClick={() => handleNavigate('/conexion')}
            >
              <FaBluetooth className="neon-pulse-icon" />
              <span>Conexión OBD2</span>
            </button>

            <button
              className={`menu-item ${activePage === 'mark-trip' ? 'active' : ''}`}
              onClick={() => handleNavigate('/mark-trip')}
            >
              <FaMapMarkedAlt />
              <span>Marcar Viaje</span>
            </button>

            <button
              className={`menu-item ${activePage === 'obd2' ? 'active' : ''}`}
              onClick={() => handleNavigate('/obd2')}
            >
              <FaCode />
              <span>Códigos OBD2</span>
            </button>

            <button
              className={`menu-item ${activePage === 'history' ? 'active' : ''}`}
              onClick={() => handleNavigate('/history')}
            >
              <FaHistory />
              <span>Historial</span>
            </button>

            <button
              className={`menu-item ${activePage === 'repairs' ? 'active' : ''}`}
              onClick={() => handleNavigate('/repairs')}
            >
              <FaWrench />
              <span>Reparaciones</span>
            </button>
          </div>
        </div>

        <button onClick={logout} className="logout-button">
          <FaSignOutAlt />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );
}

export default Sidebar;