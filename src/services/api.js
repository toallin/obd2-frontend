import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Lee directamente el .env
});

export default api;