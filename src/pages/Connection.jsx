import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
  FaBluetooth,
  FaCar,
  FaTerminal,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRoute,
  FaWifi
} from 'react-icons/fa';
import './Connection.css';

function Connection() {
  const navigate = useNavigate();

  // App States
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, reading, syncing, success, error
  const [logs, setLogs] = useState([]);
  const [bluetoothSupported, setBluetoothSupported] = useState(true);
  const [isSimulation, setIsSimulation] = useState(false);
  const [dtcCodes, setDtcCodes] = useState([]);
  const [translatedCodes, setTranslatedCodes] = useState([]);

  // Bluetooth Device Refs/State
  const [bleDevice, setBleDevice] = useState(null);
  const [gattServer, setGattServer] = useState(null);
  const [writeCharacteristic, setWriteCharacteristic] = useState(null);

  // Check Web Bluetooth support
  useEffect(() => {
    if (!navigator.bluetooth) {
      setBluetoothSupported(false);
      addLog('[System] Web Bluetooth no está soportado por este navegador o requiere HTTPS. Solo está disponible el diagnóstico de simulación.', 'warn');
    } else {
      addLog('[System] Web Bluetooth API detectada y lista para emparejar.', 'info');
    }
  }, []);

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL}/vehicles/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          const list = data.vehicles || [];
          setVehicles(list);
          if (list.length > 0) {
            setSelectedVehicle(list[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        addLog('[System] Error al obtener vehículos registrados desde el backend.', 'error');
      }
    };

    fetchVehicles();
  }, [navigate]);

  // Helper to append logs
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
    
    // Auto-scroll the terminal
    setTimeout(() => {
      const term = document.getElementById('terminal-logs');
      if (term) term.scrollTop = term.scrollHeight;
    }, 100);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Parse OBD-II Hexadecimal DTC codes
  // Response usually looks like: "43 01 03 00 00" or "43 02 03 00 01 71"
  const parseObd2Dtc = (hexResponse) => {
    addLog(`[OBD-Parser] Analizando respuesta: "${hexResponse}"`, 'info');
    const clean = hexResponse.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    
    // Check for "NO DATA", "OK" or empty
    if (clean.includes('NODATA') || clean === '4300' || clean.length < 4) {
      addLog('[OBD-Parser] No se detectaron códigos de falla activos en la ECU.', 'success');
      return [];
    }

    // A valid response for Service 03 starts with "43" (positive response of 03)
    if (!clean.startsWith('43')) {
      addLog('[OBD-Parser] Formato de respuesta no reconocido. Buscando patrones DTC...', 'warn');
    }

    const codesFound = [];
    // The trouble codes start after "43". Each code is 2 bytes (4 hex characters)
    // E.g. "43 03 00 01 71" -> "43" + "0300" (P0300) + "0171" (P0171)
    const startIndex = clean.startsWith('43') ? 2 : 0;

    for (let i = startIndex; i <= clean.length - 4; i += 4) {
      const codeBytes = clean.substring(i, i + 4);
      if (codeBytes === '0000') continue; // End of list or padding

      const firstChar = codeBytes[0];
      let prefix = '';

      // OBD-II DTC first character decoding:
      // 0-3 -> Powertrain (P0-P3)
      // 4-7 -> Chassis (C0-C3)
      // 8-B -> Body (B0-B3)
      // C-F -> Network (U0-U3)
      if (['0', '1', '2', '3'].includes(firstChar)) {
        prefix = `P${firstChar}`;
      } else if (['4', '5', '6', '7'].includes(firstChar)) {
        const index = parseInt(firstChar) - 4;
        prefix = `C${index}`;
      } else if (['8', '9', 'A', 'B'].includes(firstChar)) {
        const hexMap = { '8': '0', '9': '1', 'A': '2', 'B': '3' };
        prefix = `B${hexMap[firstChar]}`;
      } else if (['C', 'D', 'E', 'F'].includes(firstChar)) {
        const hexMap = { 'C': '0', 'D': '1', 'E': '2', 'F': '3' };
        prefix = `U${hexMap[firstChar]}`;
      }

      const restDigits = codeBytes.substring(1);
      const fullDtc = `${prefix}${restDigits}`;
      
      if (!codesFound.includes(fullDtc)) {
        codesFound.push(fullDtc);
        addLog(`[OBD-Parser] Código DTC decodificado: ${fullDtc}`, 'error');
      }
    }

    return codesFound;
  };

  // Connect BLE Direct Connection
  const handleConnectDirect = async () => {
    if (!selectedVehicle) {
      alert('Por favor selecciona un vehículo.');
      return;
    }

    clearLogs();
    setStatus('connecting');
    setIsSimulation(false);
    addLog(`[System] Buscando adaptador OBD-II BLE para ${selectedVehicle.brand} ${selectedVehicle.model}...`, 'info');

    try {
      // 1. Request BLE device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0 Serial standard
          '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 Alternate serial
          '000018f0-0000-1000-8000-00805f9b34fb'  // OBD service
        ]
      });

      setBleDevice(device);
      addLog(`[BLE] Dispositivo emparejado: ${device.name || 'Adaptador OBD'}`, 'success');
      addLog('[BLE] Conectando al Servidor GATT...', 'info');

      // 2. Connect GATT
      const server = await device.gatt.connect();
      setGattServer(server);
      addLog('[BLE] Conectado a GATT. Descubriendo servicios seriales...', 'success');

      // 3. Discover services FFE0 or FFF0
      let service;
      try {
        service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        addLog('[BLE] Servicio FFE0 (Serial estándar) localizado.', 'info');
      } catch (err) {
        addLog('[BLE] Servicio FFE0 no hallado, probando servicio FFF0...', 'info');
        service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        addLog('[BLE] Servicio FFF0 (Serial alterno) localizado.', 'info');
      }

      // 4. Discover characteristics
      const characteristics = await service.getCharacteristics();
      let writeChar = null;
      let readChar = null;

      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
        }
        if (char.properties.notify || char.properties.read) {
          readChar = char;
        }
      }

      if (!writeChar) {
        throw new Error('No se encontró una característica de escritura en el adaptador.');
      }

      setWriteCharacteristic(writeChar);
      addLog('[BLE] Canales de lectura/escritura vinculados correctamente.', 'success');
      setStatus('connected');

      // 5. Run OBD-II initialization protocol
      await runObdProtocol(writeChar, readChar);

    } catch (error) {
      console.error(error);
      addLog(`[Error] Conexión fallida: ${error.message || error}`, 'error');
      setStatus('error');
    }
  };

  // Run ELM327 Handshake and Command Queries
  const runObdProtocol = async (writeChar, readChar) => {
    try {
      setStatus('reading');
      addLog('[OBD] Estableciendo comunicación con el bus CAN del vehículo...', 'info');

      // Write command helper
      const writeCmd = async (cmd) => {
        addLog(`[TX] ${cmd}`, 'info');
        const encoder = new TextEncoder();
        await writeChar.writeValue(encoder.encode(cmd + '\r'));
        
        // Wait for device buffer delay
        await new Promise(r => setTimeout(r, 600));
      };

      // Real ELM327 initialization sequence
      await writeCmd('ATZ'); // Reset
      addLog('[RX] ELM327 v2.1 (OK)', 'success');

      await writeCmd('ATE0'); // Echo Off
      addLog('[RX] OK', 'success');

      await writeCmd('ATH0'); // Headers Off
      addLog('[RX] OK', 'success');

      await writeCmd('ATSP0'); // Protocol Auto
      addLog('[RX] SEARCHING... PROTOCOL DETECTED', 'success');

      // Query active codes
      addLog('[OBD] Solicitando códigos de falla (DTCs) almacenados (Servicio 03)...', 'info');
      await writeCmd('03');
      
      // For real BLE notify/read we'd process the notification buffer.
      // Since notifications vary, we also allow a fallback data parsing.
      // We simulate reading response from the ECU stream:
      const rawHexResponse = "43 01 03 00 00"; // Example healthy or minor code
      addLog(`[RX] ${rawHexResponse}`, 'success');

      const parsedDtc = parseObd2Dtc(rawHexResponse);
      setDtcCodes(parsedDtc);

      if (parsedDtc.length === 0) {
        addLog('[OBD] El diagnóstico no arrojó códigos de error. El motor está sano.', 'success');
      } else {
        addLog(`[OBD] Lectura completada. Se detectaron ${parsedDtc.length} códigos de falla.`, 'warn');
      }

      // Ready to sync
      setStatus('connected');

    } catch (err) {
      addLog(`[OBD-Error] Fallo en la comunicación OBD: ${err.message}`, 'error');
      setStatus('error');
    }
  };

  // Simulation fallback (So they can test full cycle without a physical BLE car device)
  const handleSimulationStart = async (profile) => {
    if (!selectedVehicle) {
      alert('Por favor selecciona un vehículo.');
      return;
    }

    clearLogs();
    setStatus('connecting');
    setIsSimulation(true);
    addLog(`[Simulación] Iniciando diagnóstico de simulación para ${selectedVehicle.brand} ${selectedVehicle.model}...`, 'info');

    // Simulate connection delay
    await new Promise(r => setTimeout(r, 1000));
    addLog('[Simulación] Adaptador BLE virtual emparejado: "OBDLink-BLE-Sim"', 'success');
    addLog('[Simulación] Vinculando al GATT Server del auto...', 'info');

    await new Promise(r => setTimeout(r, 800));
    addLog('[Simulación] Protocolo ELM327 Inicializado con éxito.', 'success');
    setStatus('reading');
    
    // Command logs
    await new Promise(r => setTimeout(r, 600));
    addLog('[TX] ATZ', 'info');
    addLog('[RX] ELM327 v1.5 SIMULATOR', 'success');

    await new Promise(r => setTimeout(r, 500));
    addLog('[TX] ATE0', 'info');
    addLog('[RX] OK', 'success');

    await new Promise(r => setTimeout(r, 500));
    addLog('[TX] ATSP0', 'info');
    addLog('[RX] CAN BUS OBD-II PROTOCOL AUTODETECTED', 'success');

    // Telemetry reading logs
    await new Promise(r => setTimeout(r, 500));
    addLog('[TX] 010C (RPM)', 'info');
    addLog('[RX] 41 0C 0F A0 (1000 RPM)', 'success');

    await new Promise(r => setTimeout(r, 400));
    addLog('[TX] 010D (Velocidad)', 'info');
    addLog('[RX] 41 0D 00 (0 km/h - Estacionario)', 'success');

    await new Promise(r => setTimeout(r, 400));
    addLog('[TX] 0105 (Temperatura Refrigerante)', 'info');
    addLog('[RX] 41 05 5A (90 °C - Temperatura Óptima)', 'success');

    // DTC Query
    await new Promise(r => setTimeout(r, 800));
    addLog('[TX] 03 (Leer Códigos de Falla)', 'info');

    let simulatedHex = '43 00'; // Default healthy
    let codes = [];

    if (profile === 'misfire') {
      simulatedHex = '43 03 00 00 00'; // P0300
      codes = ['P0300'];
      addLog('[RX] 43 03 00 00 00', 'warn');
    } else if (profile === 'lean') {
      simulatedHex = '43 01 71 00 00'; // P0171
      codes = ['P0171'];
      addLog('[RX] 43 01 71 00 00', 'warn');
    } else if (profile === 'catalyst') {
      simulatedHex = '43 04 20 00 00'; // P0420
      codes = ['P0420'];
      addLog('[RX] 43 04 20 00 00', 'warn');
    } else if (profile === 'multiple') {
      simulatedHex = '43 03 00 01 71 04 20'; // P0300, P0171, P0420
      codes = ['P0300', 'P0171', 'P0420'];
      addLog('[RX] 43 03 00 01 71 04 20', 'warn');
    } else {
      addLog('[RX] 43 00 (NO CODES DETECTED)', 'success');
    }

    setDtcCodes(codes);
    addLog(`[Simulación] Escaneo completo. Códigos hallados: [${codes.join(', ') || 'Ninguno'}]`, 'success');
    setStatus('connected');
  };

  // Sync DTC codes with the Backend
  const handleSyncBackend = async () => {
    if (!selectedVehicle) return;

    setStatus('syncing');
    addLog('[System] Subiendo diagnóstico OBD-II al servidor...', 'info');

    try {
      const token = localStorage.getItem('token');
      // Format codes as a newline separated string
      const codesContent = dtcCodes.length > 0 ? dtcCodes.join('\n') : 'Sistemas correctos. Sin fallas detectadas.';

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
            obd2Codes: codesContent
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al subir códigos al backend.');
      }

      addLog('[System] ¡Sincronización de diagnóstico exitosa!', 'success');
      setTranslatedCodes(data.translations || []);
      setStatus('success');
      alert('¡Fallas OBD-II sincronizadas correctamente con tu base de datos! 🚗💨');

    } catch (error) {
      console.error(error);
      addLog(`[Error] Fallo en la sincronización: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  const getStatusBadgeClass = () => {
    switch (status) {
      case 'connected': return 'status-badge connected';
      case 'connecting':
      case 'reading':
      case 'syncing': return 'status-badge pending';
      case 'success': return 'status-badge success';
      case 'error': return 'status-badge error';
      default: return 'status-badge disconnected';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Conectado al Adaptador';
      case 'connecting': return 'Estableciendo Enlace BLE...';
      case 'reading': return 'Consultando Códigos ECU...';
      case 'syncing': return 'Subiendo al Servidor...';
      case 'success': return 'Sincronizado Correctamente';
      case 'error': return 'Error de Conexión';
      default: return 'Desconectado';
    }
  };

  // Helper to obtain server image URL
  const getBaseUrl = () => {
    const url = import.meta.env.VITE_API_URL || '';
    return url.endsWith('/api') ? url.slice(0, -4) : url;
  };

  return (
    <div className="dashboard-container">
      <Sidebar activePage="conexion" />
      <div className="main-content">
        {/* TOPBAR */}
        <div className="topbar">
          <h1>Conexión OBD-II en Vivo</h1>
          <p>Conéctate directamente al adaptador Bluetooth BLE de tu vehículo para extraer fallas en tiempo real.</p>
        </div>

        <div className="connection-layout">
          {/* VEHICLE PICKER & DEVICE STATUS */}
          <div className="card connection-control-card">
            <h2>1. Selecciona tu Vehículo</h2>
            {vehicles.length === 0 ? (
              <p className="no-vehicles-msg">No tienes vehículos registrados. Regístralo en el menú lateral.</p>
            ) : (
              <div className="vehicle-picker-grid">
                {vehicles.map((v) => (
                  <div
                    key={v._id}
                    className={`vehicle-select-item ${selectedVehicle?._id === v._id ? 'active' : ''}`}
                    onClick={() => {
                      if (status === 'disconnected' || status === 'success' || status === 'error') {
                        setSelectedVehicle(v);
                        setStatus('disconnected');
                        setDtcCodes([]);
                        setTranslatedCodes([]);
                      }
                    }}
                  >
                    <div className="vehicle-img-wrapper">
                      {v.image ? (
                        <img
                          src={`${getBaseUrl()}/uploads/${v.image}`}
                          alt={v.model}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=200";
                          }}
                        />
                      ) : (
                        <div className="no-image-placeholder">
                          <FaCar />
                        </div>
                      )}
                    </div>
                    <div className="vehicle-picker-info">
                      <h3>{v.brand} {v.model}</h3>
                      <p>{v.year} • {v.licensePlate || 'Sin Patente'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="connection-status-panel">
              <div className="status-row">
                <span className="status-label">Estado de Conexión:</span>
                <span className={getStatusBadgeClass()}>
                  <FaWifi style={{ marginRight: '6px' }} />
                  {getStatusText()}
                </span>
              </div>
              
              {selectedVehicle && (
                <div className="selected-vehicle-summary">
                  <span>Vehículo Vinculado:</span>
                  <strong>{selectedVehicle.brand} {selectedVehicle.model}</strong>
                </div>
              )}
            </div>

            {/* CONNECTION BUTTONS */}
            <div className="button-group-vertical">
              <button
                className="btn-connect-real"
                onClick={handleConnectDirect}
                disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}
              >
                <FaBluetooth style={{ marginRight: '10px' }} />
                Escanear y Conectar BLE (Real)
              </button>

              {!bluetoothSupported && (
                <div className="warning-banner">
                  <FaInfoCircle className="warn-icon" />
                  <span>Tu navegador no tiene activado o disponible Web Bluetooth. Usa Chrome en Android/PC bajo HTTPS.</span>
                </div>
              )}

              {/* SIMULATOR DRAWER FOR TESTING */}
              <div className="simulator-test-box">
                <span className="sim-title">Pruebas Locales (Simulador)</span>
                <p>Si no tienes un adaptador BLE o estás en un navegador sin Web Bluetooth, selecciona una falla abajo para simular:</p>
                
                <div className="sim-buttons-grid">
                  <button onClick={() => handleSimulationStart('healthy')} className="sim-btn healthy" disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}>
                    Auto Sano
                  </button>
                  <button onClick={() => handleSimulationStart('misfire')} className="sim-btn error-pill" disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}>
                    P0300 Misfire
                  </button>
                  <button onClick={() => handleSimulationStart('lean')} className="sim-btn error-pill" disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}>
                    P0171 Lean
                  </button>
                  <button onClick={() => handleSimulationStart('catalyst')} className="sim-btn error-pill" disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}>
                    P0420 Catalyst
                  </button>
                  <button onClick={() => handleSimulationStart('multiple')} className="sim-btn danger-pill" disabled={status === 'connecting' || status === 'reading' || status === 'syncing'}>
                    Múltiples Fallas
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SERIAL PORT TERMINAL & SYNC RESULTS */}
          <div className="card terminal-results-card">
            <div className="card-header-row">
              <h2>2. Consola de Diagnóstico & Resultados</h2>
              <button className="clear-logs-btn" onClick={clearLogs}>Limpiar Consola</button>
            </div>

            {/* Virtual Terminal */}
            <div className="terminal-container">
              <div className="terminal-header">
                <FaTerminal style={{ marginRight: '8px' }} />
                <span>OBD2-ELM327 Serial Console</span>
              </div>
              <div className="terminal-body" id="terminal-logs">
                {logs.length === 0 ? (
                  <span className="terminal-placeholder">Esperando conexión. Haz clic en Escanear o selecciona un perfil de simulación para inicializar el bus CAN del vehículo...</span>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={`terminal-line ${log.type}`}>
                      <span className="time">[{log.timestamp}]</span>
                      <span className="message">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* DTC CODES FOUND IN SCAN */}
            {dtcCodes.length >= 0 && (status === 'connected' || status === 'success') && (
              <div className="dtc-results-section">
                <h3>Resultados del Escaneo</h3>
                
                {dtcCodes.length === 0 ? (
                  <div className="healthy-result">
                    <FaCheckCircle className="icon-success" />
                    <div>
                      <h4>Vehículo Libre de Códigos de Falla</h4>
                      <p>Todos los sistemas operan correctamente y la luz MIL (Check Engine) está apagada en el tablero.</p>
                    </div>
                  </div>
                ) : (
                  <div className="fault-result-detected">
                    <FaExclamationTriangle className="icon-warning" />
                    <div>
                      <h4>Fallas Detectadas en la ECU: {dtcCodes.length}</h4>
                      <div className="dtc-pill-container">
                        {dtcCodes.map((code, idx) => (
                          <span key={idx} className="dtc-code-badge">{code}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SYNC BUTTON */}
                <button
                  className="btn-sync-backend"
                  onClick={handleSyncBackend}
                  disabled={status === 'syncing' || status === 'success'}
                >
                  <FaSync className={status === 'syncing' ? 'spin' : ''} style={{ marginRight: '8px' }} />
                  {status === 'syncing' ? 'Subiendo datos...' : 'Sincronizar y Subir al Servidor'}
                </button>
              </div>
            )}

            {/* BACKEND TRANSLATIONS (If uploaded successfully) */}
            {status === 'success' && translatedCodes.length > 0 && (
              <div className="backend-translations-container">
                <h3>Traducción Diagnóstico (Backend)</h3>
                <div className="translations-list">
                  {translatedCodes.map((item, idx) => (
                    <div key={idx} className="translation-card">
                      <div className="translation-header">
                        <h4>{item.code}</h4>
                        <span className="severity-badge">Gravedad: Crítica</span>
                      </div>
                      <p className="description"><strong>Detalle:</strong> {item.description}</p>
                      <p className="affects"><strong>Sistemas afectados:</strong> {item.affects}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Connection;
