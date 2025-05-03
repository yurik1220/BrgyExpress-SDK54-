import React from "react";
import { Routes, Route } from "react-router-dom";
import DocumentRequests from '../pages/document-requests';
import IncidentReports from '../pages/incident-reports';
import CreateIDRequests from '../pages/id-requests';
import AnnouncementPage from "../pages/announcement-page";

const MainContent = () => {
    return (
        <div className="main-content">
            <Routes>
                <Route path="/" element={<h2>Select a tab to view requests</h2>} />
                <Route path="/document-requests" element={<DocumentRequests />} />
                <Route path="/incident-reports" element={<IncidentReports />} />
                <Route path="/id-requests" element={<CreateIDRequests />} />
                <Route path="/announcement-page" element={<AnnouncementPage />} />
            </Routes>
        </div>
    );
};

export default MainContent;
