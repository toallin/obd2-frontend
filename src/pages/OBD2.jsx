import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; // ✅ Importamos tu instancia de Axios
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

    // 🔹 OBTENER VEHÍCULOS
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const res = await api.get('/api/vehicles/my');
                setVehicles(res.data.vehicles || []);
            } catch (error) {
                console.error("Error al cargar vehículos:", error);
            }
        };
        fetchVehicles();
    }, []);

    // 🔹 OBTENER HISTORIAL OBD2 AL SELECCIONAR VEHÍCULO
    useEffect(() => {
        if (!selectedVehicle) {
            setResults([]);
            return;
        }

        const fetchVehicleHistory = async () => {
            try {
                const res = await api.get(`/api/vehicledata/${selectedVehicle._id}`);
                const data = res.data;

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

    // 🔹 SUBIR Y ENVIAR TXT
    const handleUploadAndSend = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedVehicle) return;

        try {
            const content = await file.text();
            if (!content || content.trim() === "") {
                alert("El archivo está vacío.");
                return;
            }

            const res = await api.post('/api/vehicledata/upload', {
                vehicle: selectedVehicle._id,
                obd2Codes: content
            });

            alert("¡Diagnóstico OBD-II actualizado con éxito! 🚗💨");
            setResults(res.data.translations || []);
        } catch (error) {
            console.error("Error subiendo archivo:", error);
            alert("Error al procesar el diagnóstico en el servidor.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar activePage="obd2" />
            <div className="main-content" style={{ padding: 0 }}>
                <div className="obd2-page">
                    {/* SIDEBAR VEHÍCULOS */}
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

                    {/* MAIN CONTENT */}
                    <div className="obd2-main">
                        {!selectedVehicle ? (
                            <div className="select-message">Selecciona un vehículo</div>
                        ) : (
                            <>
                                {/* Tarjeta de Vehículo */}
                                <div className="hero-card">
                                    {selectedVehicle.image ? (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL || 'https://tu-backend.onrender.com'}/uploads/${selectedVehicle.image}`}
                                            alt={selectedVehicle.model}
                                            className="hero-image"
                                        />
                                    ) : (
                                        <div className="hero-image-placeholder"><FaCarSide /></div>
                                    )}
                                    {/* ... el resto de tu estructura de datos se mantiene igual ... */}
                                    <div className="hero-info">
                                        <h1>{selectedVehicle.brand}</h1>
                                        <h2>{selectedVehicle.model}</h2>
                                        {/* Detalle visual... */}
                                    </div>
                                </div>

                                {/* Botón de carga */}
                                <div className="obd2-card" style={{ marginTop: '30px' }}>
                                    <input type="file" accept=".txt" hidden ref={fileInputRef} onChange={handleUploadAndSend} />
                                    <button className="send-button" onClick={() => fileInputRef.current.click()}>
                                        <FaFileUpload style={{ marginRight: '10px' }} />
                                        Seleccionar y Analizar Archivo .TXT
                                    </button>
                                </div>

                                {/* Resultados */}
                                {results.length > 0 && (
                                    <div className="results-container">
                                        <h2>Códigos Detectados</h2>
                                        <div className="results-grid">
                                            {results.map((item, index) => (
                                                <div key={index} className="result-card">
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