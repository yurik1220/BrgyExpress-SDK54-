import React from "react";
import { NavLink } from "react-router-dom";
import '../styles/Dashboard.css';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <h2>🇵🇭 BrgyExpress</h2>
            <ul>
                <li>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-chart-line"></i>
                        Dashboard
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/document-requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-file-alt"></i>
                        Document Requests
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/incident-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-exclamation-triangle"></i>
                        Incident Reports
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/id-requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-id-card"></i>
                        Create ID Requests
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/announcement-page" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-bullhorn"></i>
                        Announcement Page
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
