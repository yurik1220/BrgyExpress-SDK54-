import React from "react";
import { NavLink } from "react-router-dom";
import '../styles/Sidebar.css';

const Sidebar = ({ onSignOut }) => {
    // Get admin data from localStorage
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    return (
        <div className="sidebar">
            <h2>PH BrgyExpress</h2>
            <ul>
                <li>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-home"></i>
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
                <li>
                    <NavLink to="/audit-logs" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-history"></i>
                        Audit Logs
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-chart-line"></i>
                        Analytics
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/account-maintenance" className={({ isActive }) => isActive ? 'active' : ''}>
                        <i className="fas fa-users-cog"></i>
                        Acct. Maintenance
                    </NavLink>
                </li>

            </ul>
            
            {/* Admin Profile Section */}
            <div className="sidebar-user-section">
                <div className="user-info">
                    <div className="user-avatar">
                        {adminData.full_name ? adminData.full_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="user-details">
                        <div className="user-name">
                            {adminData.full_name || 'Barangay Secretary'}
                        </div>
                        <div className="user-email">
                            {adminData.username || 'admin'}
                        </div>
                    </div>
                </div>
                <button className="sign-out-button" onClick={onSignOut}>
                    <i className="fas fa-sign-out-alt"></i>
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
