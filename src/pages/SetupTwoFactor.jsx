import { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  FaShieldAlt,
  FaCheckCircle,
  FaMobileAlt,
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';

import loginBg from '../assets/bg_login.jpg';

import './SetupTwoFactor.css';

function SetupTwoFactor() {

  const navigate = useNavigate();
  const location = useLocation();

  // El email viene del registro (pasado via state)
  const email = location.state?.email || '';

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('qr'); // 'qr' | 'verify' | 'done'

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    fetchQR();
  }, []);

  const fetchQR = async () => {
    try {
      setLoading(true);
      const response = await api.post('/auth/2fa/setup', { email });
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
    } catch (err) {
      setError('No se pudo generar el código QR. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (e) => {
    e.preventDefault();
    setError('');

    if (token.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos.');
      return;
    }

    try {
      setVerifying(true);
      await api.post('/auth/2fa/verify-setup', { email, token });
      setStep('done');
    } catch (err) {
      setError('Código incorrecto. Verifica tu app y vuelve a intentarlo.');
    } finally {
      setVerifying(false);
    }
  };

  const handleTokenInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
  };

  return (
    <div
      className="setup2fa-page"
      style={{ backgroundImage: `url(${loginBg})` }}
    >

      <div className="setup2fa-overlay"></div>
      <div className="setup2fa-glow"></div>

      <div className="setup2fa-container">

        <div className="setup2fa-car-overlay"></div>

        {/* Icono principal */}
        <div className="setup2fa-icon">
          <FaShieldAlt />
        </div>

        <h1 className="setup2fa-title">
          DOBLE FACTOR
        </h1>

        <p className="setup2fa-subtitle">
          Protege tu cuenta con autenticación TOTP
        </p>

        {/* Pasos visuales */}
        <div className="setup2fa-steps">
          <div className={`setup2fa-step ${step === 'qr' ? 'active' : 'done'}`}>
            <span>1</span>
            <p>Escanear QR</p>
          </div>
          <div className="setup2fa-step-line"></div>
          <div className={`setup2fa-step ${step === 'verify' ? 'active' : step === 'done' ? 'done' : ''}`}>
            <span>2</span>
            <p>Verificar</p>
          </div>
          <div className="setup2fa-step-line"></div>
          <div className={`setup2fa-step ${step === 'done' ? 'done' : ''}`}>
            <span>3</span>
            <p>Listo</p>
          </div>
        </div>

        {/* ===== PASO 1: QR ===== */}
        {step === 'qr' && (
          <div className="setup2fa-qr-section">

            <div className="setup2fa-instructions">
              <div className="setup2fa-instruction-item">
                <FaMobileAlt className="instr-icon" />
                <span>Abre <strong>Microsoft Authenticator</strong> o <strong>Google Authenticator</strong> en tu celular</span>
              </div>
              <div className="setup2fa-instruction-item">
                <span className="instr-number">2</span>
                <span>Toca <strong>"Agregar cuenta"</strong> y selecciona <strong>"Otra cuenta (Google, etc.)"</strong></span>
              </div>
              <div className="setup2fa-instruction-item">
                <span className="instr-number">3</span>
                <span>Escanea el código QR que aparece abajo</span>
              </div>
            </div>

            {loading ? (
              <div className="setup2fa-loading">
                <FaSpinner className="spinner" />
                <p>Generando código QR...</p>
              </div>
            ) : qrCode ? (
              <div className="setup2fa-qr-wrapper">
                <img
                  src={qrCode}
                  alt="Código QR para autenticación"
                  className="setup2fa-qr-image"
                />
                <p className="setup2fa-qr-label">Escanea con tu app</p>
              </div>
            ) : (
              <div className="setup2fa-error-box">
                <p>{error}</p>
                <button onClick={fetchQR} className="setup2fa-retry-btn">
                  Reintentar
                </button>
              </div>
            )}

            {secret && (
              <div className="setup2fa-manual">
                <p className="manual-label">¿No puedes escanear? Ingresa manualmente:</p>
                <code className="manual-secret">{secret}</code>
              </div>
            )}

            <button
              className="setup2fa-btn-primary"
              onClick={() => setStep('verify')}
              disabled={!qrCode}
            >
              Ya escaneé el QR
              <FaArrowRight />
            </button>

          </div>
        )}

        {/* ===== PASO 2: VERIFICAR ===== */}
        {step === 'verify' && (
          <div className="setup2fa-verify-section">

            <p className="verify-description">
              Ingresa el código de <strong>6 dígitos</strong> que aparece ahora mismo en tu app de autenticación.
            </p>

            <form onSubmit={verifyToken} className="verify-form">

              <div className="totp-input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={token}
                  onChange={handleTokenInput}
                  className="totp-input"
                  maxLength={6}
                  autoFocus
                />
                <div className="totp-input-bar"></div>
              </div>

              {error && (
                <div className="verify-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="setup2fa-btn-primary"
                disabled={token.length !== 6 || verifying}
              >
                {verifying ? (
                  <>
                    <FaSpinner className="spinner" />
                    Verificando...
                  </>
                ) : (
                  <>
                    VERIFICAR CÓDIGO
                    <FaArrowRight />
                  </>
                )}
              </button>

              <button
                type="button"
                className="setup2fa-btn-secondary"
                onClick={() => setStep('qr')}
              >
                ← Volver al QR
              </button>

            </form>

          </div>
        )}

        {/* ===== PASO 3: ÉXITO ===== */}
        {step === 'done' && (
          <div className="setup2fa-success-section">

            <div className="success-checkmark">
              <FaCheckCircle />
            </div>

            <h2 className="success-title">¡Cuenta Protegida!</h2>

            <p className="success-description">
              Tu autenticación de dos factores ha sido configurada exitosamente.
              Ahora cada vez que inicies sesión, necesitarás tu app autenticadora.
            </p>

            <div className="success-info">
              <p>✅ Microsoft Authenticator compatible</p>
              <p>✅ Google Authenticator compatible</p>
              <p>✅ Código cambia cada 30 segundos</p>
            </div>

            <button
              className="setup2fa-btn-primary"
              onClick={() => navigate('/')}
            >
              IR AL LOGIN
              <FaArrowRight />
            </button>

          </div>
        )}

        <div className="setup2fa-footer">
          OBD-II SYSTEM © 2026 • Seguridad TOTP RFC 6238
        </div>

      </div>

    </div>
  );
}

export default SetupTwoFactor;
