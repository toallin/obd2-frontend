import axios from 'axios';

const api = axios.create({
    // Forzamos la URL real directamente en el código para romper el bucle
    baseURL: 'https://obd2-backend.onrender.com/api'
});

export default api;
