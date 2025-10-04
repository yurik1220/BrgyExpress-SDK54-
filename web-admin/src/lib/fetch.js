// Axios instance used by the admin web app for all API calls.
// Centralizes:
// - Base URL resolution (env → global window var → localhost fallback)
// - Attaching Authorization token for admin requests
// - Merging admin_username in mutating requests to aid backend audit logs
// - Global 401 handling to force logout and redirect to /login
import axios from 'axios';

// Resolve API base URL from env with localhost fallback
const API_BASE = process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000';

// Create axios instance with default config
// Do NOT force a default Content-Type so Axios can set
// the correct headers automatically (e.g., multipart boundaries for FormData)
const api = axios.create({
    baseURL: API_BASE,
});

// Request interceptor: attach token and add admin_username to mutating requests
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
                    // If sending FormData, append instead of object spread to avoid losing file payloads
                    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
                        config.data.append('admin_username', admin.username);
                        // Ensure we don't force a JSON content-type for multipart
                        if (config.headers && config.headers['Content-Type']) {
                            delete config.headers['Content-Type'];
                        }
                    } else {
                        config.data = {
                            ...config.data,
                            admin_username: admin.username
                        };
                    }
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

// Response interceptor: on 401, clear session and redirect to /login
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            try {
                // Attempt to call backend logout for audit logging, but don't block
                fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
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