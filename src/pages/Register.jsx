import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

import loginBg from '../assets/bg_login.jpg';

import './Register.css';

function Register() {

    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const register = async (e) => {

        e.preventDefault();

        try {

            await api.post('/auth/register', {
                email,
                password
            });

            alert('Usuario registrado');

            navigate('/');

        } catch (error) {

            console.log(error);

            alert('Error al registrar');
        }
    };

    return (

        <div
            className="register-page"
            style={{ backgroundImage: `url(${loginBg})` }}
        >

            <div className="register-overlay"></div>

            <div className="register-container">

                <h1 className="register-title">
                    REGISTRO
                </h1>

                <p className="register-subtitle">
                    Sistema Inteligente OBD-II
                </p>

                <form
                    onSubmit={register}
                    className="register-form"
                >

                    <input
                        type="email"
                        placeholder="Correo Electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="register-input"
                        required
                    />

                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="register-input"
                        required
                    />

                    <button
                        type="submit"
                        className="register-button"
                    >
                        REGISTRAR
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="back-button"
                    >
                        VOLVER
                    </button>

                </form>

            </div>

        </div>
    );
}

export default Register;