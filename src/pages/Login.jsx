import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

import {
  FaEnvelope,
  FaLock,
  FaArrowRight,
  FaUserPlus,
  FaShieldAlt,
  FaSpinner,
  FaChevronLeft
} from 'react-icons/fa';

import loginBg from '../assets/bg_login.jpg';

import './Login.css';

function Login() {

  const navigate = useNavigate();

  // ---- Estado paso 1: credenciales ----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ---- Estado paso 2: TOTP ----
  const [step, setStep] = useState('credentials'); // 'credentials' | 'totp'
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- PASO 1: verificar credenciales ----
  const login = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // El backend valida email+password y, si tiene 2FA activo,
      // responde con { requires2FA: true } en vez del token definitivo.
      const response = await api.post('/auth/login', { email, password });

      if (response.data.requires2FA) {
        // Usuario tiene 2FA configurado → pedir el código TOTP
        setStep('totp');
      } else {
        // Usuario sin 2FA → login normal (si decides soportarlo)
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      }

    } catch (err) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // ---- PASO 2: verificar código TOTP ----
  const verifyTotp = async (e) => {
    e.preventDefault();
    setError('');

    if (totp.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/2fa/login', { email, token: totp });
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');

    } catch (err) {
      setError('Código incorrecto o expirado. Intenta con el código actual de tu app.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTotp(value);
  };

  const goBack = () => {
    setStep('credentials');
    setTotp('');
    setError('');
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

        {/* =========================================
            PASO 1: Correo + Contraseña
            ========================================= */}
        {step === 'credentials' && (
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

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="login-spinner" />
                  VERIFICANDO...
                </>
              ) : (
                <>
                  INGRESAR
                  <FaArrowRight />
                </>
              )}
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
        )}

        {/* =========================================
            PASO 2: Código TOTP
            ========================================= */}
        {step === 'totp' && (
          <div className="totp-section">

            <div className="totp-header">
              <div className="totp-shield">
                <FaShieldAlt />
              </div>
              <h2 className="totp-title">Verificación 2FA</h2>
              <p className="totp-desc">
                Ingresa el código de <strong>6 dígitos</strong> de tu app autenticadora
                (<strong>Microsoft</strong> o <strong>Google Authenticator</strong>)
              </p>
              <p className="totp-email-badge">{email}</p>
            </div>

            <form onSubmit={verifyTotp} className="login-form">

              <div className="totp-code-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={totp}
                  onChange={handleTotpInput}
                  className="totp-code-input"
                  maxLength={6}
                  autoFocus
                />
                <div className="totp-code-bar"></div>
              </div>

              <p className="totp-hint">
                El código cambia cada 30 segundos
              </p>

              {error && (
                <div className="login-error totp-error-shake">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={totp.length !== 6 || loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="login-spinner" />
                    VERIFICANDO...
                  </>
                ) : (
                  <>
                    CONFIRMAR
                    <FaArrowRight />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={goBack}
                className="register-button"
              >
                <FaChevronLeft />
                VOLVER
              </button>

            </form>

          </div>
        )}

        <div className="login-footer">
          OBD-II SYSTEM © 2026
        </div>

      </div>

    </div>
  );
}

export default Login;