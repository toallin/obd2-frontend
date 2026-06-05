import { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; // ✅ Importamos tu instancia de Axios
import './MarkTrip.css';

function MarkTrip() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [tripInfo, setTripInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // ... (tus refs y lógica de mapa se mantienen iguales)
  const mapInstanceRef = useRef(null);
  const mapRef = useRef(null);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const currentPolylineRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const originCoordsRef = useRef(null);
  const destinationCoordsRef = useRef(null);
  const selectingOriginRef = useRef(true);

  // 🔹 VEHÍCULOS: Usando api.get
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/api/vehicles/my');
        setVehicles(res.data.vehicles || []);
      } catch (err) {
        console.error("Error cargando vehículos:", err);
      }
    };
    fetchVehicles();
  }, []);

  // 🔹 GOOGLE MAPS (Carga blindada contra duplicados)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const scriptId = "google-maps-script";

    const checkAndInit = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initMap();
      } else {
        setTimeout(checkAndInit, 100);
      }
    };

    if (window.google && window.google.maps && window.google.maps.places) {
      checkAndInit();
      return;
    }

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.onload = checkAndInit;
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.onload = checkAndInit;
    document.body.appendChild(script);

    return () => {
      const activeScript = document.getElementById(scriptId);
      if (activeScript) activeScript.onload = null;
    };
  }, []);

  const initMap = () => {
    if (!window.google || !window.google.maps) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: -18.0146, lng: -70.2536 },
      zoom: 13,
    });
    mapInstanceRef.current = map;

    // 🔥 AUTOCOMPLETE
    const originAuto = new window.google.maps.places.Autocomplete(originInputRef.current);
    const destAuto = new window.google.maps.places.Autocomplete(destInputRef.current);

    originAuto.addListener('place_changed', () => {
      const place = originAuto.getPlace();
      if (!place.geometry) return;
      setOrigin(place.formatted_address || '');
      originCoordsRef.current = place.geometry.location;

      if (originMarkerRef.current) originMarkerRef.current.setMap(null);
      originMarkerRef.current = new window.google.maps.Marker({
        position: place.geometry.location,
        map,
        label: 'A',
      });

      drawRoute();
    });

    destAuto.addListener('place_changed', () => {
      const place = destAuto.getPlace();
      if (!place.geometry) return;
      setDestination(place.formatted_address || '');
      destinationCoordsRef.current = place.geometry.location;

      if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);
      destinationMarkerRef.current = new window.google.maps.Marker({
        position: place.geometry.location,
        map,
        label: 'B',
      });

      drawRoute();
    });

    // 🔥 CLICK EN MAPA
    map.addListener('click', (e) => {
      const coords = e.latLng;

      if (selectingOriginRef.current) {
        originCoordsRef.current = coords;
        setOrigin(`Lat: ${coords.lat().toFixed(5)}, Lng: ${coords.lng().toFixed(5)}`);

        if (originMarkerRef.current) originMarkerRef.current.setMap(null);

        originMarkerRef.current = new window.google.maps.Marker({
          position: coords,
          map,
          label: 'A',
        });

        selectingOriginRef.current = false;
      } else {
        destinationCoordsRef.current = coords;
        setDestination(`Lat: ${coords.lat().toFixed(5)}, Lng: ${coords.lng().toFixed(5)}`);

        if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(null);

        destinationMarkerRef.current = new window.google.maps.Marker({
          position: coords,
          map,
          label: 'B',
        });

        selectingOriginRef.current = true;
        drawRoute();
      }
    });
  };

  const drawRouteFallback = () => {
    if (!originCoordsRef.current || !destinationCoordsRef.current) return;

    if (!window.google || !window.google.maps || !window.google.maps.geometry) {
      console.warn("La librería Geometry de Google Maps no está lista.");
      return;
    }

    console.log("Activando estimación geométrica automática...");

    if (currentPolylineRef.current) {
      currentPolylineRef.current.setMap(null);
    }

    // Dibujamos una línea recta directa en rojo suave
    currentPolylineRef.current = new window.google.maps.Polyline({
      path: [originCoordsRef.current, destinationCoordsRef.current],
      geodesic: true,
      strokeColor: '#FF3333',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(originCoordsRef.current);
    bounds.extend(destinationCoordsRef.current);
    mapInstanceRef.current.fitBounds(bounds);

    // Calculamos distancia esférica y multiplicamos por 1.25 para estimar curvas reales de camino
    const meters = window.google.maps.geometry.spherical.computeDistanceBetween(
      originCoordsRef.current,
      destinationCoordsRef.current
    );

    const estimatedMeters = meters * 1.25;
    const distanceKm = Number((estimatedMeters / 1000).toFixed(2));
    const durationMin = Math.max(1, Math.round(distanceKm * 1.2)); // 50 km/h velocidad promedio

    const distanceText = `${distanceKm} km (Est.)`;
    const hours = Math.floor(durationMin / 60);
    const minutes = durationMin % 60;
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

    setTripInfo({
      distanceText,
      durationText,
      distanceKm,
      durationMin,
    });
  };

  // 🔥 NUEVA IMPLEMENTACIÓN ESTÁNDAR Y ESTABLE (DirectionsService con Fallback Inteligente)
  const drawRoute = () => {
    if (!originCoordsRef.current || !destinationCoordsRef.current) return;

    if (!window.google || !window.google.maps) {
      console.warn("La API de Google Maps no está lista.");
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    const request = {
      origin: originCoordsRef.current,
      destination: destinationCoordsRef.current,
      travelMode: 'DRIVING',
    };

    try {
      console.log("Enviando solicitud de ruta a DirectionsService...");
      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result.routes.length > 0) {
          const route = result.routes[0];
          const leg = route.legs[0];

          if (currentPolylineRef.current) {
            currentPolylineRef.current.setMap(null);
          }

          currentPolylineRef.current = new window.google.maps.Polyline({
            path: route.overview_path,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: mapInstanceRef.current
          });

          const bounds = new window.google.maps.LatLngBounds();
          route.overview_path.forEach(latLng => bounds.extend(latLng));
          mapInstanceRef.current.fitBounds(bounds);

          const distanceText = leg.distance.text;
          const durationText = leg.duration.text;

          // Convertimos a km y minutos de forma robusta
          const distanceKm = Number((leg.distance.value / 1000).toFixed(2));
          const durationMin = Math.round(leg.duration.value / 60);

          setTripInfo({
            distanceText,
            durationText,
            distanceKm,
            durationMin,
          });

        } else {
          console.warn("DirectionsService no devolvió ninguna ruta válida:", status);
          drawRouteFallback();
        }
      });
    } catch (error) {
      console.error("Error crítico calculando la ruta con DirectionsService:", error);
      drawRouteFallback();
    }
  };

  // 🔹 CREAR VIAJE (CORREGIDO: Enviando tiempo y distancia reales)
  const handleCreateTrip = async () => {
    if (!selectedVehicle || !origin || !destination) {
      alert('Completa todo el formulario');
      return;
    }

    setLoading(true);
    try {
      const bodyPayload = {
        vehicleId: selectedVehicle,
        origin,
        destination,
        distanceKm: tripInfo?.distanceKm || 0,
        durationMin: tripInfo?.durationMin || 0,
      };

      const res = await api.post('/api/trips', bodyPayload);

      if (res.data.trip) {
        setAnalysis({
          ...(res.data.trip.aiAnalysis || {}),
          durationMin: res.data.trip.durationMin,
          distanceKm: res.data.trip.distanceKm,
        });
        alert('Viaje creado con éxito y analizado 🚗');
      }
    } catch (err) {
      console.error("Error al guardar el viaje:", err);
      alert('Error en el servidor al crear viaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar activePage="mark-trip" />

      <div className="main-content">
        <h1>Planificar Viaje 🚗</h1>

        <div className="trip-form">
          <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
            <option value="">Selecciona vehículo</option>
            {vehicles.map(v => (
              <option key={v._id} value={v._id}>
                {v.brand} {v.model}
              </option>
            ))}
          </select>

          <input
            ref={originInputRef}
            placeholder="📍 De"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />

          <input
            ref={destInputRef}
            placeholder="🏁 A"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />

          <button onClick={handleCreateTrip}>
            {loading ? 'Analizando...' : 'Crear Viaje'}
          </button>
        </div>

        <div ref={mapRef} className="map-container" />

        {/* 🔹 RESULTADO COMPLETO DEL ANÁLISIS BACKEND */}
        {analysis && (
          <div className="analysis-panel">
            <h2 className="title">📊 Resultado del Análisis</h2>

            <div className="grid-cards">
              <div className={`card risk ${analysis.riskLevel === 'High' ? 'high' : analysis.riskLevel === 'Medium' ? 'medium' : 'low'}`}>
                <h3>⚠️ Riesgo del Viaje</h3>
                <p><strong>{analysis.riskLevel}</strong></p>
              </div>

              <div className="card safety">
                <h3>🚗 Estado del Vehículo</h3>
                <p>{analysis.safeToTravel ? '✅ Seguro para viajar' : '❌ No recomendado viajar'}</p>
              </div>

              <div className="card time">
                <h3>⏱️ Tiempo Estimado</h3>
                <p><strong>Distancia total:</strong> {tripInfo ? tripInfo.distanceText : (analysis.distanceKm ? `${analysis.distanceKm} km` : 'No disponible')}</p>
                <p style={{ marginTop: '5px' }}><strong>Tiempo de viaje:</strong> {tripInfo ? tripInfo.durationText : formatDuration(analysis.durationMin)}</p>
              </div>
            </div>

            {analysis.warnings?.length > 0 && (
              <div className="card warning">
                <h3>⚠️ Advertencias del sistema</h3>
                <ul>
                  {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {analysis.recommendations?.length > 0 && (
              <div className="card recommend">
                <h3>💡 Recomendaciones del sistema</h3>
                <ul>
                  {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkTrip;