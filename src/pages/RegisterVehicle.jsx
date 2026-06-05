import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; // ✅ Importamos tu instancia centralizada de Axios

import {
    FaCar,
    FaCalendarAlt,
    FaImage,
    FaSave
} from 'react-icons/fa';

import './RegisterVehicle.css';

function RegisterVehicle() {

    const navigate = useNavigate();

    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [image, setImage] = useState(null);

    const [preview, setPreview] = useState(null);

    // SUBIR IMAGEN
    const handleImage = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // REGISTRAR VEHICULO (Migrado a Axios)
    const registerVehicle = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();

            formData.append('brand', brand);
            formData.append('model', model);
            formData.append('year', year);

            if (image) {
                formData.append('image', image);
            }

            // ✅ Cambiado 'fetch' con localhost por la instancia 'api' apuntando a producción
            // Axios configura automáticamente el 'Content-Type': 'multipart/form-data' al pasar un FormData
            const res = await api.post('/vehicles/register', formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            alert('Vehículo registrado correctamente 🚗');
            console.log(res.data);

            // LIMPIAR FORMULARIO
            setBrand('');
            setModel('');
            setYear('');
            setImage(null);
            setPreview(null);

            // REDIRIGIR
            navigate('/dashboard');

        } catch (error) {
            console.error("Error al registrar vehículo:", error);

            // Capturamos el mensaje exacto que devuelva tu servidor si la petición falla
            const errMsg = error.response?.data?.message || 'Error del servidor al registrar el vehículo';
            alert(errMsg);
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar activePage="register-vehicle" />
            <div className="main-content">
                <div className="topbar">
                    <h1>Registrar Vehículo</h1>
                    <p>Agrega tu automóvil al sistema OBD-II</p>
                </div>
                <div className="register-vehicle-content" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <div className="vehicle-card" style={{ width: '100%', maxWidth: '600px', boxShadow: '0 0 35px rgba(0, 255, 136, 0.1)' }}>
                        <form
                            onSubmit={registerVehicle}
                            className="vehicle-form"
                        >
                            {/* MARCA */}
                            <div className="input-box">
                                <FaCar className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Marca"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    required
                                />
                            </div>

                            {/* MODELO */}
                            <div className="input-box">
                                <FaCar className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Modelo"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    required
                                />
                            </div>

                            {/* FECHA */}
                            <div className="input-box">
                                <FaCalendarAlt className="input-icon" />
                                <input
                                    type="date"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    required
                                />
                            </div>

                            {/* SUBIR IMAGEN */}
                            <label className="upload-box">
                                <FaImage />
                                {image ? image.name : 'Subir Imagen'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImage}
                                    hidden
                                />
                            </label>

                            {/* PREVIEW */}
                            {preview && (
                                <img
                                    src={preview}
                                    alt="preview"
                                    className="preview-image"
                                />
                            )}

                            {/* BOTON */}
                            <button
                                type="submit"
                                className="save-button"
                            >
                                <FaSave />
                                Guardar Vehículo
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterVehicle;