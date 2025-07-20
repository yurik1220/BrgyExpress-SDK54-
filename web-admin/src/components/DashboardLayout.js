import React, { useState, useEffect } from 'react';
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

    // Handle automatic logout on window/tab close
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            // Logout immediately when window/tab is being closed
            // sessionManager.logout(); // Temporarily disabled for debugging
        };

        const handleVisibilityChange = () => {
            // Logout when page becomes hidden (tab switch, minimize, etc.)
            if (document.hidden) {
                // sessionManager.logout(); // Temporarily disabled for debugging
            }
        };

        const handlePageHide = (event) => {
            // Logout when page is being unloaded
            // sessionManager.logout(); // Temporarily disabled for debugging
        };

        // Add event listeners for different scenarios
        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        // Cleanup event listeners on component unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

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