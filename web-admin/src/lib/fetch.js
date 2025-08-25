import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include admin token
api.interceptors.request.use(
    (config) => {
        // Get admin token from localStorage
        const adminToken = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        
        if (adminToken) {
            config.headers.Authorization = `Bearer ${adminToken}`;
        }
        
        // Add admin username to request body if it's a PATCH/POST/PUT request
        if (adminData && (config.method === 'patch' || config.method === 'post' || config.method === 'put')) {
            try {
                const admin = JSON.parse(adminData);
                if (admin.username) {
                    config.data = {
                        ...config.data,
                        admin_username: admin.username
                    };
                }
            } catch (e) {
                console.error('Error parsing admin data:', e);
            }
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            try {
                // Attempt to call backend logout for audit logging, but don't block
                fetch('http://localhost:5000/api/admin/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
            } catch {}
            // Hard client-side logout regardless of API state
            localStorage.removeItem('adminData');
            localStorage.removeItem('adminToken');
            window.location.replace('/login');
        }
        return Promise.reject(error);
    }
);

export default api; 