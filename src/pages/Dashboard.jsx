import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  FaCar,
  FaWrench,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
  FaRoute,
  FaHeartbeat,
  FaDollarSign,
  FaClock,
  FaTachometerAlt
} from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import './Dashboard.css';

function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [recentRepairs, setRecentRepairs] = useState([]);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const [metrics, setMetrics] = useState({
    totalVehicles: 0,
    totalTrips: 0,
    totalKm: 0,
    totalHours: 0,
    totalSpent: 0,
    totalActiveCodes: 0,
    avgHealth: 100
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        // 1. Obtener vehículos y viajes en paralelo
        const [vehiclesRes, tripsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/vehicles/my`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/trips`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        if (vehiclesRes.status === 401 || tripsRes.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
          return;
        }

        const vehiclesData = await vehiclesRes.json();
        const tripsData = await tripsRes.json();

        const vehiclesList = vehiclesData.vehicles || [];
        const tripsList = Array.isArray(tripsData) ? tripsData : [];

        // 2. Obtener reparaciones y diagnósticos OBD2 en paralelo para cada vehículo
        const repairsPromises = vehiclesList.map(v =>
          fetch(`${import.meta.env.VITE_API_URL}/repairs/vehicle/${v._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.json()).catch(() => ({ repairs: [] }))
        );

        const obdPromises = vehiclesList.map(v =>
          fetch(`${import.meta.env.VITE_API_URL}/vehicledata/${v._id}?t=${Date.now()}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.json()).catch(() => ({ obd2Data: [] }))
        );

        const repairsResults = await Promise.all(repairsPromises);
        const obdResults = await Promise.all(obdPromises);

        // 3. Mapear la información para cada vehículo
        const mappedVehicles = vehiclesList.map((v, idx) => {
          const repairs = repairsResults[idx]?.repairs || [];
          const obd2Data = obdResults[idx]?.obd2Data || [];
          const latestObd = obd2Data.length > 0 ? obd2Data[0] : null;
          const activeCodes = latestObd?.translations || [];

          // Calcular salud del vehículo individual (empieza en 100, -15% por cada código de falla activo)
          const healthScore = Math.max(15, 100 - (activeCodes.length * 15));

          return {
            ...v,
            repairs,
            activeCodes,
            healthScore,
            latestObd
          };
        });

        // 4. Calcular métricas consolidadas
        const totalVehicles = mappedVehicles.length;
        const totalTrips = tripsList.length;
        const totalKm = tripsList.reduce((sum, t) => sum + (Number(t.distanceKm) || 0), 0);
        const totalMin = tripsList.reduce((sum, t) => sum + (Number(t.durationMin) || 0), 0);
        const totalHours = (totalMin / 60).toFixed(1);

        // Sumar todos los costos de reparaciones
        let totalSpent = 0;
        const allRepairsFlat = [];
        mappedVehicles.forEach(v => {
          v.repairs.forEach(r => {
            totalSpent += Number(r.cost) || 0;
            allRepairsFlat.push({
              ...r,
              vehicleId: v._id,
              vehicleName: `${v.brand} ${v.model}`
            });
          });
        });

        // Calcular códigos de falla únicos activos
        let totalActiveCodes = 0;
        const activeAlarmsList = [];
        mappedVehicles.forEach(v => {
          if (v.activeCodes && v.activeCodes.length > 0) {
            totalActiveCodes += v.activeCodes.length;
            activeAlarmsList.push({
              vehicleId: v._id,
              vehicleName: `${v.brand} ${v.model}`,
              codes: v.activeCodes
            });
          }
        });

        // Salud general promedio
        const totalHealthSum = mappedVehicles.reduce((sum, v) => sum + v.healthScore, 0);
        const avgHealth = totalVehicles > 0 ? Math.round(totalHealthSum / totalVehicles) : 100;

        // Ordenar reparaciones por fecha
        allRepairsFlat.sort((a, b) => new Date(b.repairDate) - new Date(a.repairDate));

        // Actualizar estados
        setVehicles(mappedVehicles);
        setTrips(tripsList);
        setRecentRepairs(allRepairsFlat.slice(0, 4));
        setActiveAlarms(activeAlarmsList);
        setMetrics({
          totalVehicles,
          totalTrips,
          totalKm: Math.round(totalKm * 10) / 10,
          totalHours,
          totalSpent,
          totalActiveCodes,
          avgHealth
        });

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // Formatear monedas
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formatear fechas
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  // --- CONFIGURACIÓN DE GRÁFICO 1: TENDENCIA DE DISTANCIA DE VIAJES (SVG Line Chart) ---
  const getLineChartData = () => {
    // Tomar los últimos 8 viajes y ordenarlos cronológicamente (más antiguo al más reciente)
    const recentTrips = [...trips]
      .reverse()
      .slice(-8);

    if (recentTrips.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = { top: 20, bottom: 25, left: 45, right: 15 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxDistance = Math.max(...recentTrips.map(t => Number(t.distanceKm) || 0), 10);

    const points = recentTrips.map((t, idx) => {
      const x = padding.left + (idx / (recentTrips.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (((Number(t.distanceKm) || 0) / maxDistance) * chartHeight);
      return { x, y, trip: t };
    });

    const linePath = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

    return {
      width,
      height,
      padding,
      chartHeight,
      chartWidth,
      maxDistance,
      points,
      linePath,
      areaPath
    };
  };

  const lineChart = getLineChartData();

  // --- CONFIGURACIÓN DE GRÁFICO 2: GASTO POR TIPO DE MANTENIMIENTO (Horizontal Bar Chart) ---
  const getBarChartData = () => {
    const categoryCosts = {};
    vehicles.forEach(v => {
      v.repairs.forEach(r => {
        const type = r.type || 'Otro';
        categoryCosts[type] = (categoryCosts[type] || 0) + (Number(r.cost) || 0);
      });
    });

    const sorted = Object.entries(categoryCosts)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const maxCost = sorted.length > 0 ? sorted[0].cost : 1;

    return {
      categories: sorted,
      maxCost
    };
  };

  const barChart = getBarChartData();

  // Color de salud
  const getHealthColor = (score) => {
    if (score >= 85) return '#00ff88'; // Saludable
    if (score >= 60) return '#ffaa00'; // Alertas leves
    return '#ff4d4d'; // Crítico
  };

  // Base URL para imágenes
  const getBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || '';
    return url.endsWith('/api') ? url.slice(0, -4) : url;
  };

  return (
    <div className="dashboard-container">
      <Sidebar activePage="dashboard" />

      {loading ? (
        <div className="dashboard-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Sincronizando telemetría vehicular...</p>
        </div>
      ) : (
        <div className="main-content">
          {/* Topbar */}
          <div className="topbar">
            <h1>Panel de Control</h1>
            <p>Estado operacional y telemetría de tus vehículos en tiempo real</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card total-cars-card">
              <div className="stat-icon-wrapper blue-glow">
                <FaCar className="stat-icon" />
              </div>
              <div className="stat-details">
                <h2>{metrics.totalVehicles}</h2>
                <p>Vehículos Activos</p>
              </div>
            </div>

            <div className="stat-card mileage-card">
              <div className="stat-icon-wrapper green-glow">
                <FaRoute className="stat-icon" />
              </div>
              <div className="stat-details">
                <h2>{metrics.totalKm} km</h2>
                <p>Distancia Acumulada</p>
              </div>
            </div>

            <div className="stat-card repairs-spent-card">
              <div className="stat-icon-wrapper purple-glow">
                <FaDollarSign className="stat-icon" />
              </div>
              <div className="stat-details">
                <h2>{formatMoney(metrics.totalSpent)}</h2>
                <p>Inversión Mantenimiento</p>
              </div>
            </div>

            <div className="stat-card health-score-card">
              <div className="stat-icon-wrapper" style={{ color: getHealthColor(metrics.avgHealth) }}>
                <FaHeartbeat className="stat-icon" />
              </div>
              <div className="stat-details">
                <h2>{metrics.avgHealth}%</h2>
                <p>Salud Promedio</p>
              </div>
            </div>
          </div>

          {/* Gráficos y Visualizaciones */}
          <div className="charts-layout-grid">
            {/* Gráfico de Tendencia de Distancia */}
            <div className="dashboard-section chart-box-card">
              <h3 className="section-subtitle">
                <FaRoute style={{ marginRight: '8px', color: '#00d2ff' }} />
                Historial de Recorridos (Últimos Viajes)
              </h3>
              <div className="svg-chart-container" style={{ position: 'relative' }}>
                {lineChart ? (
                  <>
                    <svg viewBox={`0 0 ${lineChart.width} ${lineChart.height}`} className="svg-line-chart">
                      <defs>
                        <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00ff88" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Gridlines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const y = lineChart.padding.top + ratio * lineChart.chartHeight;
                        const labelValue = Math.round(lineChart.maxDistance * (1 - ratio));
                        return (
                          <g key={i} className="chart-gridline">
                            <line
                              x1={lineChart.padding.left}
                              y1={y}
                              x2={lineChart.width - lineChart.padding.right}
                              y2={y}
                              stroke="rgba(255, 255, 255, 0.05)"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={lineChart.padding.left - 10}
                              y={y + 4}
                              fill="#6b7280"
                              fontSize="10"
                              textAnchor="end"
                            >
                              {labelValue} km
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {lineChart.areaPath && (
                        <path d={lineChart.areaPath} fill="url(#chart-area-grad)" />
                      )}

                      {/* Main Stroke Line */}
                      {lineChart.linePath && (
                        <path
                          d={lineChart.linePath}
                          fill="none"
                          stroke="#00ff88"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="line-stroke-glow"
                        />
                      )}

                      {/* Interactive Circles */}
                      {lineChart.points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredPoint?.trip?._id === p.trip._id ? '7' : '4.5'}
                          fill="#070707"
                          stroke="#00ff88"
                          strokeWidth="2.5"
                          className="chart-circle-point"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </svg>

                    {/* Tooltip flotante */}
                    {hoveredPoint && (
                      <div
                        className="chart-tooltip"
                        style={{
                          left: `${(hoveredPoint.x / lineChart.width) * 100}%`,
                          top: `${(hoveredPoint.y / lineChart.height) * 100 - 32}%`
                        }}
                      >
                        <p className="tooltip-car">🚗 {hoveredPoint.trip.vehicle?.brand} {hoveredPoint.trip.vehicle?.model}</p>
                        <p className="tooltip-loc">{hoveredPoint.trip.origin} ➔ {hoveredPoint.trip.destination}</p>
                        <p className="tooltip-metrics">
                          <span>{hoveredPoint.trip.distanceKm} km</span>
                          <span>•</span>
                          <span>{hoveredPoint.trip.durationMin} mins</span>
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-chart-placeholder">
                    <p>No hay registros de viajes suficientes para graficar tendencias.</p>
                    <button className="nav-shortcut-btn" onClick={() => navigate('/mark-trip')}>
                      Registrar Primer Viaje ➔
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Gastos por Categoría */}
            <div className="dashboard-section chart-box-card">
              <h3 className="section-subtitle">
                <FaWrench style={{ marginRight: '8px', color: '#9d4edd' }} />
                Distribución de Gastos en Reparaciones
              </h3>
              <div className="bar-chart-container">
                {barChart.categories.length > 0 ? (
                  <div className="bar-chart-list">
                    {barChart.categories.map((cat, idx) => {
                      const percentage = (cat.cost / barChart.maxCost) * 100;
                      return (
                        <div key={idx} className="bar-chart-row">
                          <div className="bar-label-info">
                            <span className="cat-name">🔧 {cat.name}</span>
                            <span className="cat-val">{formatMoney(cat.cost)}</span>
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill purple-pink-grad"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-chart-placeholder">
                    <p>Aún no has registrado reparaciones o mantenimientos pagados en el cuaderno.</p>
                    <button className="nav-shortcut-btn" onClick={() => navigate('/repairs')}>
                      Registrar Reparación ➔
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid Inferior: Mis Vehículos, Alertas y Reparaciones Recientes */}
          <div className="info-layout-grid">

            {/* Mis Vehículos y su Estado de Salud */}
            <div className="dashboard-section grid-span-2 info-card">
              <div className="section-header-row">
                <h3>Mis Vehículos</h3>
                <button className="view-more-btn" onClick={() => navigate('/register-vehicle')}>
                  + Registrar
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="empty-state-inner">
                  <p>No tienes autos registrados en tu perfil.</p>
                </div>
              ) : (
                <div className="vehicles-health-list">
                  {vehicles.map((v) => (
                    <div key={v._id} className="vehicle-health-row">
                      <div className="vehicle-pic-col">
                        {v.image ? (
                          <img
                            src={`${getBaseUrl()}/uploads/${v.image}`}
                            alt={v.model}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=300";
                            }}
                          />
                        ) : (
                          <div className="vehicle-pic-placeholder">
                            <FaCar />
                          </div>
                        )}
                      </div>
                      <div className="vehicle-info-col">
                        <h4>{v.brand} {v.model}</h4>
                        <p>Año: {v.year} • {v.licensePlate ? `Patente: ${v.licensePlate}` : 'Sin patente'}</p>
                      </div>
                      <div className="vehicle-health-status-col">
                        <span className="health-percentage" style={{ color: getHealthColor(v.healthScore) }}>
                          {v.healthScore}%
                        </span>
                        <div className="health-bar-track">
                          <div
                            className="health-bar-fill"
                            style={{
                              width: `${v.healthScore}%`,
                              backgroundColor: getHealthColor(v.healthScore)
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Códigos OBD-II Activos / Alarmas */}
            <div className="dashboard-section info-card">
              <h3>
                <FaExclamationTriangle style={{ marginRight: '8px', color: '#ff4d4d' }} />
                Alertas OBD-II Activas
              </h3>

              {metrics.totalActiveCodes === 0 ? (
                <div className="all-clear-card">
                  <FaCheckCircle className="clear-icon" />
                  <h4>Sistemas Correctos</h4>
                  <p>No se han detectado códigos de falla activos en tus vehículos.</p>
                </div>
              ) : (
                <div className="active-alarms-list">
                  {activeAlarms.map((alarm, idx) => (
                    <div key={idx} className="vehicle-alarms-group">
                      <h5>{alarm.vehicleName}</h5>
                      <div className="alarms-grid-row">
                        {alarm.codes.map((codeObj, cIdx) => (
                          <div key={cIdx} className="alarm-code-pill">
                            <div className="code-badge">{codeObj.code}</div>
                            <div className="code-details">
                              <p className="code-desc">{codeObj.description}</p>
                              <span className="code-affects">Afecta: {codeObj.affects}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Mantenimientos Recientes */}
            <div className="dashboard-section info-card">
              <h3>
                <FaWrench style={{ marginRight: '8px', color: '#9d4edd' }} />
                Mantenimientos Recientes
              </h3>

              {recentRepairs.length === 0 ? (
                <div className="empty-state-inner">
                  <p>No hay registros de mantenimiento en el cuaderno.</p>
                  <button className="nav-shortcut-btn" onClick={() => navigate('/repairs')}>
                    Registrar Mantenimiento ➔
                  </button>
                </div>
              ) : (
                <div className="recent-repairs-timeline">
                  {recentRepairs.map((rep, idx) => (
                    <div key={rep._id || idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-header-row">
                          <span className="timeline-title">🔧 {rep.type}</span>
                          <span className="timeline-cost">{formatMoney(rep.cost)}</span>
                        </div>
                        <p className="timeline-vehicle-tag">{rep.vehicleName}</p>
                        <p className="timeline-date">{formatDate(rep.repairDate)} • {rep.workshopName || 'Taller Particular'}</p>
                        {rep.description && <p className="timeline-desc-snippet">{rep.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;