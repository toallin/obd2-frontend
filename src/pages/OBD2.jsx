import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';

import {
    FaCar,
    FaCheckCircle,
    FaFileUpload,
    FaCarSide,
    FaCalendarAlt
} from 'react-icons/fa';

import './OBD2.css';

function OBD2() {

    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [results, setResults] = useState([]);

    const fileInputRef = useRef(null);

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
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Error cargando historial:", error);
                setResults([]);
            }
        };

        fetchVehicleHistory();
    }, [selectedVehicle]);

    // 3. SUBIR Y ENVIAR TXT (CON VARIABLE DE ENTORNO)
    const handleUploadAndSend = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!selectedVehicle) {
            alert('Selecciona un vehículo');
            return;
        }

        try {
            const content = await file.text();
            console.log("📄 CONTENIDO TXT:", content);

            if (!content || content.trim() === "") {
                alert(`El archivo "${file.name}" (${file.size} bytes) está vacío o no se pudo leer. Asegúrate de que tenga códigos OBD2 escritos.`);
                return;
            }

            const token = localStorage.getItem('token');
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/vehicledata/upload`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        vehicle: selectedVehicle._id,
                        obd2Codes: content
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || 'Error al subir los códigos OBD2');
                return;
            }

            alert("¡Diagnóstico OBD-II actualizado con éxito! 🚗💨");
            setResults(data.translations || []);

        } catch (error) {
            console.error("Error leyendo archivo:", error);
            alert("Error leyendo el archivo");
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

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

                                {/* SECCIÓN DE UPLOAD ABAJO */}
                                <div className="obd2-card" style={{ marginTop: '30px' }}>
                                    <h2>Diagnóstico OBD-II</h2>
                                    <p style={{ color: '#9ca3af', marginBottom: '20px', fontSize: '15px', lineHeight: '1.6' }}>
                                        Sube el archivo de diagnóstico <code>.txt</code> extraído de tu escáner OBD-II para traducir los códigos de falla y analizar su impacto en el vehículo.
                                    </p>

                                    <input
                                        type="file"
                                        accept=".txt"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleUploadAndSend}
                                    />

                                    <button
                                        className="send-button"
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        <FaFileUpload style={{ marginRight: '10px' }} />
                                        Seleccionar y Analizar Archivo .TXT
                                    </button>
                                </div>

                                {/* RESULTADOS */}
                                {results.length > 0 && (
                                    <div className="results-container">
                                        <h2>Códigos Detectados</h2>
                                        <div className="results-grid">
                                            {results.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="result-card"
                                                >
                                                    <h3>{item.code}</h3>
                                                    <p>{item.description}</p>
                                                    <span>Sistemas Afectados: {item.affects}</span>
                                                </div>
                                            ))}
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