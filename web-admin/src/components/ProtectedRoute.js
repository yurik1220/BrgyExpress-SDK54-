import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const validateSession = async () => {
            try {
                // Check if admin data exists in localStorage
                const adminData = localStorage.getItem('adminData');
                const adminToken = localStorage.getItem('adminToken');

                if (!adminData || !adminToken) {
                    setIsAuthenticated(false);
                    setIsValidating(false);
                    return;
                }

                // Validate session with backend
                const response = await axios.get('http://localhost:5000/api/admin/session', {
                    timeout: 5000 // 5 second timeout
                });

                if (response.data.success) {
                    setIsAuthenticated(true);
                } else {
                    // Session invalid, clear localStorage
                    localStorage.removeItem('adminData');
                    localStorage.removeItem('adminToken');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Session validation error:', error);
                // On error, clear localStorage and redirect to login
                localStorage.removeItem('adminData');
                localStorage.removeItem('adminToken');
                setIsAuthenticated(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateSession();
    }, []);

    // Show loading while validating
    if (isValidating) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #007bff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                        Validating session...
                    </p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Render children if authenticated
    return children;
};

export default ProtectedRoute; 