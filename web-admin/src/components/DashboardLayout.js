import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ConfirmationModal from './ConfirmationModal';
import SessionWarning from './SessionWarning';
import sessionManager from '../lib/sessionManager';
import '../styles/Dashboard.css';
import '../styles/Sidebar.css';

const DashboardLayout = () => {
    const location = useLocation();
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    const handleSignOutClick = () => {
        setShowSignOutModal(true);
    };

    const handleSignOutConfirm = () => {
        // Use session manager to logout
        sessionManager.logout();
        
        // Close modal
        setShowSignOutModal(false);
    };

    const handleSignOutCancel = () => {
        setShowSignOutModal(false);
    };

    return (
        <div className="app-container">
            <Sidebar onSignOut={handleSignOutClick} currentPath={location.pathname} />
            <div className="main-content">
                <Outlet />
            </div>
            
            <SessionWarning />
            
            <ConfirmationModal
                isOpen={showSignOutModal}
                onConfirm={handleSignOutConfirm}
                onCancel={handleSignOutCancel}
                title="Sign Out"
                message="Are you sure you want to sign out? You will need to log in again to access the dashboard."
                confirmText="Sign Out"
                cancelText="Cancel"
            />
        </div>
    );
};

export default DashboardLayout; 