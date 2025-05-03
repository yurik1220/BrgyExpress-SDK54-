import React from "react";
import { NavLink } from "react-router-dom";
import '../styles/Dashboard.css';

const Sidebar = () => {
    return (
        <div className="sidebar">
            <h2>🇵🇭 BrgyExpress</h2>
            <ul>
                <li>
                    <NavLink to="/document-requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        Document Requests
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/incident-reports" className={({ isActive }) => isActive ? 'active' : ''}>
                        Incident Reports
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/id-requests" className={({ isActive }) => isActive ? 'active' : ''}>
                        Create ID Requests
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/announcement-page" className={({ isActive }) => isActive ? 'active' : ''}>
                        Announcement Page
                    </NavLink>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
