import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

import {
  FaEnvelope,
  FaLock,
  FaArrowRight,
  FaUserPlus
} from 'react-icons/fa';

import loginBg from '../assets/bg_login.jpg';

import './Login.css';

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async (e) => {

    e.preventDefault();

    try {

      const response = await api.post('/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);

      navigate('/dashboard');

    } catch (error) {

      console.log(error);

      alert('Credenciales incorrectas');

    }
  };

  return (

    <div
      className="login-page"
      style={{ backgroundImage: `url(${loginBg})` }}
    >

      <div className="login-overlay"></div>

      <div className="login-glow"></div>

      <div className="login-container">

        <div className="car-overlay"></div>

        <div className="login-logo">
          OBD-II
        </div>

        <h1 className="login-title">
          OBD-II SYSTEM
        </h1>

        <p className="login-subtitle">
          AI Diagnostics • ECU Analytics • Performance Monitoring
        </p>

        <form onSubmit={login} className="login-form">

          <div className="input-box">

            <FaEnvelope className="input-icon" />

            <input
              type="email"
              placeholder="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              required
            />

          </div>

          <div className="input-box">

            <FaLock className="input-icon" />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              required
            />

          </div>

          <button
            type="submit"
            className="login-button"
          >

            INGRESAR

            <FaArrowRight />

          </button>

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="register-button"
          >

            <FaUserPlus />

            CREAR CUENTA

          </button>

        </form>

        <div className="login-footer">
          OBD-II SYSTEM © 2026
        </div>

      </div>

    </div>
  );
}

export default Login;