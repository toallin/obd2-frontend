import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  FaCar,
  FaMapMarkedAlt,
  FaCode,
  FaTachometerAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaHistory,
  FaWrench
} from 'react-icons/fa';
import './Sidebar.css'; // Asegúrate de que Sidebar.css esté exactamente en la misma carpeta src/components/

function Sidebar({ activePage }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
        const res = await api.get('/api/auth/profile');
        setUser(res.data.user);
      } catch (error) {
        console.error("Error al cargar perfil:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  // Lista de navegación con referencias de componentes para un mapeo limpio en Vite
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { id: 'register-vehicle', label: 'Registrar Auto', icon: FaCar, path: '/register-vehicle' },
    { id: 'mark-trip', label: 'Marcar Viaje', icon: FaMapMarkedAlt, path: '/mark-trip' },
    { id: 'obd2', label: 'Códigos OBD2', icon: FaCode, path: '/obd2' },
    { id: 'history', label: 'Historial', icon: FaHistory, path: '/history' },
    { id: 'repairs', label: 'Reparaciones', icon: FaWrench, path: '/repairs' },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="logo">OBD-II</div>

        <div className="profile">
          <FaUserCircle className="profile-icon" />
          <div>
            <h3>{loading ? 'Cargando...' : (user?.email || 'Usuario')}</h3>
            <p>Sistema Vehicular</p>
          </div>
        </div>

        <nav className="menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon; // Extraemos la referencia del icono dinámicamente
            return (
              <button
                key={item.id}
                className={`menu-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <IconComponent /> <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <button onClick={logout} className="logout-button">
        <FaSignOutAlt /> <span>Cerrar Sesión</span>
      </button>
    </aside>
  );
}

export default Sidebar;