import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/dashboard';
import DocumentRequests from './pages/document-requests';
import IncidentReports from './pages/incident-reports';
import CreateIDRequests from './pages/id-requests';
import AnnouncementPage from './pages/announcement-page';
import AuditLogs from './pages/audit-logs';
import './styles/Dashboard.css';

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes - All admin routes use DashboardLayout */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="document-requests" element={<DocumentRequests />} />
                    <Route path="incident-reports" element={<IncidentReports />} />
                    <Route path="id-requests" element={<CreateIDRequests />} />
                    <Route path="announcement-page" element={<AnnouncementPage />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                </Route>
                
                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
