import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

import {
    FaCar,
    FaCheckCircle,
    FaCarSide,
    FaCalendarAlt,
    FaChevronDown,
    FaChevronUp,
    FaTools,
    FaVolumeUp,
    FaInfoCircle
} from 'react-icons/fa';

import './OBD2.css';

function OBD2() {

    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [results, setResults] = useState([]);
    const [expandedCodes, setExpandedCodes] = useState({});

    const toggleCode = (index) => {
        setExpandedCodes(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };



    // 1. CARGAR VEHÍCULOS (CON VARIABLE DE ENTORNO)
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const token = localStorage.getItem('token');
                // Se utiliza la variable de entorno directa que ya contiene /api
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/vehicles/my`,
                    {
                        headers: {
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

    // 2. OBTENER HISTORIAL OBD2 (CON VARIABLE DE ENTORNO)
    useEffect(() => {
        if (!selectedVehicle) {
            setResults([]);
            return;
        }

        const fetchVehicleHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/vehicledata/${selectedVehicle._id}?t=${Date.now()}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await res.json();
                console.log("📄 HISTORIAL OBD2:", data);

                if (data.obd2Data && data.obd2Data.length > 0) {
                    setResults(data.obd2Data[0].translations || []);
                    setExpandedCodes({});
                } else {
                    setResults([]);
                    setExpandedCodes({});
                }
            } catch (error) {
                console.error("Error cargando historial:", error);
                setResults([]);
            }
        };

        fetchVehicleHistory();
    }, [selectedVehicle]);



    // Función auxiliar para obtener la URL limpia del servidor de imágenes (remueve el segmento /api)
    const getBaseUrl = () => {
        const url = import.meta.env.VITE_API_URL || '';
        return url.endsWith('/api') ? url.slice(0, -4) : url;
    };

    return (
        <div className="dashboard-container">
            <Sidebar activePage="obd2" />
            <div className="main-content" style={{ padding: 0 }}>
                <div className="obd2-page">

                    {/* SIDEBAR */}
                    <div className="vehicle-sidebar">
                        <h2>Mis Vehículos</h2>
                        {vehicles.map((vehicle) => (
                            <div
                                key={vehicle._id}
                                className={`vehicle-item ${selectedVehicle?._id === vehicle._id ? 'active' : ''}`}
                                onClick={() => setSelectedVehicle(vehicle)}
                            >
                                <FaCar />
                                <div>
                                    <h3>{vehicle.brand}</h3>
                                    <p>{vehicle.model}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MAIN */}
                    <div className="obd2-main">
                        {!selectedVehicle ? (
                            <div className="select-message">
                                Selecciona un vehículo
                            </div>
                        ) : (
                            <>
                                <div className="hero-card">
                                    {selectedVehicle.image ? (
                                        <img
                                            // getBaseUrl() debe retornar la URL de Render en producción y localhost en local
                                            src={`${getBaseUrl()}/uploads/${selectedVehicle.image}`}
                                            alt={selectedVehicle.model}
                                            className="hero-image"
                                            onError={(e) => {
                                                // Si la imagen física no existe en Render (porque el servidor se reinició),
                                                // colocamos una imagen por defecto del sistema para que no quede en negro.
                                                e.target.onerror = null;
                                                e.target.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=500";
                                            }}
                                        />
                                    ) : (
                                        <div className="hero-image-placeholder">
                                            <FaCarSide />
                                        </div>
                                    )}

                                    <div className="hero-info">
                                        <h1>{selectedVehicle.brand}</h1>
                                        <h2>{selectedVehicle.model}</h2>

                                        <div className="vehicle-details-grid">
                                            <div className="vehicle-detail-item">
                                                <FaCarSide className="detail-icon" />
                                                <div className="detail-text-container">
                                                    <span className="detail-label">Marca</span>
                                                    <span className="detail-value">{selectedVehicle.brand}</span>
                                                </div>
                                            </div>

                                            <div className="vehicle-detail-item">
                                                <FaCar className="detail-icon" />
                                                <div className="detail-text-container">
                                                    <span className="detail-label">Modelo</span>
                                                    <span className="detail-value">{selectedVehicle.model}</span>
                                                </div>
                                            </div>

                                            <div className="vehicle-detail-item">
                                                <FaCalendarAlt className="detail-icon" />
                                                <div className="detail-text-container">
                                                    <span className="detail-label">Año</span>
                                                    <span className="detail-value">
                                                        {selectedVehicle.year ? (selectedVehicle.year.includes('-') ? selectedVehicle.year.split('-')[0] : selectedVehicle.year) : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="vehicle-detail-item">
                                                <FaCheckCircle className="detail-icon" />
                                                <div className="detail-text-container">
                                                    <span className="detail-label">Estado</span>
                                                    <span className="detail-value" style={{ color: '#00ff88' }}>Conectado</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>



                                {/* RESULTADOS */}
                                {results.length > 0 && (
                                    <div className="results-container">
                                        <h2>Códigos Detectados</h2>
                                        <div className="results-grid">
                                            {results.map((item, index) => {
                                                const isExpanded = !!expandedCodes[index];
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`result-card ${isExpanded ? 'expanded' : ''}`}
                                                        onClick={() => toggleCode(index)}
                                                    >
                                                        <div className="result-card-header">
                                                            <div className="code-header-info">
                                                                <span className="code-badge">{item.code}</span>
                                                                <h3 className="code-title">{item.description}</h3>
                                                            </div>
                                                            <div className="chevron-icon-container">
                                                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                                            </div>
                                                        </div>

                                                        <div className={`result-card-content ${isExpanded ? 'expanded' : ''}`}>
                                                            <div className="result-field">
                                                                <div className="field-label">
                                                                    <FaInfoCircle className="field-icon label-icon-affects" />
                                                                    <span>Sistemas Afectados</span>
                                                                </div>
                                                                <p className="field-value badge-affects">{item.affects}</p>
                                                            </div>

                                                            {item.symptoms && (
                                                                <div className="result-field">
                                                                    <div className="field-label">
                                                                        <FaVolumeUp className="field-icon label-icon-symptoms" />
                                                                        <span>Síntomas / Ruidos Comunes</span>
                                                                    </div>
                                                                    <p className="field-value text-symptoms">{item.symptoms}</p>
                                                                </div>
                                                            )}

                                                            {item.guide && (
                                                                <div className="result-field">
                                                                    <div className="field-label">
                                                                        <FaTools className="field-icon label-icon-guide" />
                                                                        <span>Guía de Diagnóstico Rápido</span>
                                                                    </div>
                                                                    <div className="field-value guide-steps">
                                                                        {item.guide.split('\n').map((step, sIdx) => (
                                                                            <p key={sIdx} className="guide-step">{step}</p>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default OBD2;