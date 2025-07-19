import React, { useState, useEffect } from 'react';
import sessionManager from '../lib/sessionManager';
import '../styles/Dashboard.css';

const SessionWarning = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(30);

    useEffect(() => {
        const checkSession = () => {
            const timeLeft = sessionManager.getRemainingTime();
            setRemainingTime(timeLeft);
            
            // Show warning when less than 5 minutes remaining
            if (timeLeft <= 5 && timeLeft > 0) {
                setShowWarning(true);
            } else {
                setShowWarning(false);
            }
        };

        // Check every minute
        const interval = setInterval(checkSession, 60000);
        checkSession(); // Initial check

        return () => clearInterval(interval);
    }, []);

    const extendSession = () => {
        sessionManager.extendSession();
        setShowWarning(false);
    };

    if (!showWarning) return null;

    return (
        <div className="session-warning">
            <div className="session-warning-content">
                <div className="session-warning-icon">
                    <i className="fas fa-clock"></i>
                </div>
                <div className="session-warning-text">
                    <h4>Session Expiring Soon</h4>
                    <p>Your session will expire in {remainingTime} minutes due to inactivity.</p>
                </div>
                <button className="session-warning-button" onClick={extendSession}>
                    Extend Session
                </button>
            </div>
        </div>
    );
};

export default SessionWarning; 