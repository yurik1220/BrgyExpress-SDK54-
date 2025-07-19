import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('adminData');
    const adminToken = localStorage.getItem('adminToken');

    // Redirect to login if not authenticated
    if (!adminData || !adminToken) {
        return <Navigate to="/login" replace />;
    }

    // Render children if authenticated
    return children;
};

export default ProtectedRoute; 