import React from "react";
import { Routes, Route } from "react-router-dom";
import DocumentRequests from '../pages/document-requests';
import IncidentReports from '../pages/incident-reports';
import CreateIDRequests from '../pages/id-requests';

const MainContent = () => {
    return (
        <div className="main-content">
            <Routes>
                <Route path="/" element={<h2>Select a tab to view requests</h2>} />
                <Route path="/document-requests" element={<DocumentRequests />} />
                <Route path="/incident-reports" element={<IncidentReports />} />
                <Route path="/id-requests" element={<CreateIDRequests />} />
            </Routes>
        </div>
    );
};

export default MainContent;
