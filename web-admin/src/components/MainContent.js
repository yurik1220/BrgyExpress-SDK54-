import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DocumentRequests from '../pages/document-requests';
import IncidentReports from '../pages/incident-reports';
import CreateIDRequests from '../pages/id-requests';
import AnnouncementPage from "../pages/announcement-page";
import Dashboard from "../pages/dashboard";

const MainContent = () => {
    return (
        <div className="main-content">
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/document-requests" element={<DocumentRequests />} />
                <Route path="/incident-reports" element={<IncidentReports />} />
                <Route path="/id-requests" element={<CreateIDRequests />} />
                <Route path="/announcement-page" element={<AnnouncementPage />} />
            </Routes>
        </div>
    );
};

export default MainContent;