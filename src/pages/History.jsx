import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; // ✅ Importamos tu instancia de Axios
import './History.css';

function History() {
  const [vehiclesWithTrips, setVehiclesWithTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatDuration = (mins) => {
    if (!mins) return 'No disponible';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        // Configuración de headers para Axios
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Obtener vehículos y viajes usando la instancia 'api'
        const [vehRes, tripsRes] = await Promise.all([
          api.get('/api/vehicles/my', config),
          api.get('/api/trips', config)
        ]);

        const vehiclesList = vehRes.data.vehicles || [];
        const tripsData = tripsRes.data || [];

        const mapped = vehiclesList.map(vehicle => {
          const vehicleTrips = Array.isArray(tripsData)
            ? tripsData.filter(t => {
              const tVehicleId = t.vehicle?._id || t.vehicle;
              return tVehicleId === vehicle._id;
            })
            : [];

          return {
            ...vehicle,
            latestTrip: vehicleTrips.length > 0 ? vehicleTrips[0] : null,
          };
        });

        setVehiclesWithTrips(mapped);
      } catch (err) {
        console.error("Error al obtener los datos del historial:", err);
        if (err.response?.status === 401) navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // ... El resto de tu renderizado (return) permanece igual ...
  // (Asegúrate de copiar el resto del return desde tu archivo original)

  return (
    <div className="dashboard-container">
      <Sidebar activePage="history" />

      <div className="main-content">
        <div className="topbar">
          <h1>Historial por Vehículo 🚗</h1>
          <p>Consulta el último recorrido registrado y diagnóstico OBD-II de cada uno de tus autos.</p>
        </div>

        {loading ? (
          <div className="loading-container">
            <span>SINCRO-DIAGNÓSTICO EN PROCESO...</span>
          </div>
        ) : vehiclesWithTrips.length === 0 ? (
          <div className="empty-history">
            <div className="empty-history-icon">🚗</div>
            <h3>No tienes vehículos registrados</h3>
            <p>Primero registra un auto en la pestaña "Registrar Auto" para comenzar tu historial de diagnósticos.</p>
          </div>
        ) : (
          <div className="history-grid">
            {vehiclesWithTrips.map((vehicle) => {
              const trip = vehicle.latestTrip;
              const hasTrip = !!trip;
              const hasObdCodes = hasTrip && trip.obdCodes && trip.obdCodes.trim() !== "";

              // Estado de viaje
              let cardClass = "no-trips";
              let statusText = "Sin viajes";
              let riskLevel = null;
              let safeToTravel = null;

              if (hasTrip) {
                safeToTravel = trip.aiAnalysis?.safeToTravel;
                riskLevel = trip.aiAnalysis?.riskLevel;
                cardClass = safeToTravel ? "safe" : "unsafe";
                statusText = safeToTravel ? "Apto para viajar" : "No recomendado";
              }

              return (
                <div
                  key={vehicle._id}
                  className={`vehicle-history-card ${cardClass}`}
                >
                  <div className="card-header">
                    <div className="card-header-main">
                      <h2>
                        🚗 {vehicle.brand} {vehicle.model}
                      </h2>
                      <div className="card-badges">
                        <span className={`badge ${cardClass}`}>
                          {statusText}
                        </span>
                        {riskLevel && (
                          <span className={`risk-tag ${riskLevel}`}>
                            {riskLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    {vehicle.year && (
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                        Año modelo: {vehicle.year} {vehicle.licensePlate ? `• Patente: ${vehicle.licensePlate}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Sección OBD-II */}
                  <div className={`obd-section ${hasObdCodes ? 'error' : 'ok'}`}>
                    <div className="obd-header">
                      {hasObdCodes ? '⚠️ Códigos OBD2 Activos (Último Viaje)' : '✅ Sistema OBD2'}
                    </div>
                    {hasObdCodes ? (
                      <span className="obd-codes">{trip.obdCodes}</span>
                    ) : hasTrip ? (
                      <span className="obd-ok-text">Sin códigos de falla detectados (¡Todo OK!)</span>
                    ) : (
                      <span className="obd-ok-text" style={{ color: '#94a3b8' }}>Pendiente de primer diagnóstico de ruta</span>
                    )}
                  </div>

                  {/* Detalles de Ruta */}
                  <div className="route-section">
                    {hasTrip ? (
                      <>
                        <div className="route-step">
                          <span className="icon">📍</span>
                          <div>
                            <span>Origen:</span>
                            <strong>{trip.origin}</strong>
                          </div>
                        </div>
                        <div className="route-step">
                          <span className="icon">🏁</span>
                          <div>
                            <span>Destino:</span>
                            <strong>{trip.destination}</strong>
                          </div>
                        </div>

                        <div className="metrics-row">
                          <div className="metric-box">
                            <span className="metric-label">Distancia Total</span>
                            <span className="metric-value">{trip.distanceKm ? `${trip.distanceKm} km` : 'No disponible'}</span>
                          </div>
                          <div className="metric-box">
                            <span className="metric-label">Tiempo Estimado</span>
                            <span className="metric-value">{trip.durationMin ? formatDuration(trip.durationMin) : 'No disponible'}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 10px 0' }}>
                          Este auto no ha realizado ningún viaje planificado aún.
                        </p>
                        <a
                          href="/mark-trip"
                          style={{
                            color: '#00ff88',
                            textDecoration: 'underline',
                            fontSize: '0.9rem',
                            fontWeight: '700'
                          }}
                        >
                          Planificar primer viaje ➔
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Advertencias breves de la IA */}
                  {hasTrip && trip.aiAnalysis?.warnings?.length > 0 && (
                    <div style={{
                      fontSize: '0.82rem',
                      color: '#f87171',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '0.8rem',
                      marginTop: 'auto'
                    }}>
                      <strong>Alerta IA:</strong> {trip.aiAnalysis.warnings[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;