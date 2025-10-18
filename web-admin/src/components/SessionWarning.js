import React, { useState, useEffect } from 'react';
import sessionManager from '../lib/sessionManager';

const SessionWarning = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    useEffect(() => {
        const checkSession = () => {
            if (sessionManager.isSessionValid()) {
                const remaining = sessionManager.getRemainingTime();
                
                console.log('Checking session - remaining:', remaining, 'minutes');
                
                // Show warning when session is expiring soon
                if (sessionManager.isSessionExpiringSoon()) {
                    setRemainingTime(Math.ceil(remaining));
                    setShowWarning(true);
                    console.log('Warning modal should show');
                } else {
                    setShowWarning(false);
                }
            } else {
                setShowWarning(false);
            }
        };

        // Check every 2 seconds for more responsive warning
        const interval = setInterval(checkSession, 2000);
        
        // Initial check
        checkSession();

        return () => clearInterval(interval);
    }, []);

    const logout = () => {
        sessionManager.logout();
    };

    const closeWarning = () => {
        // Close the warning and reset the session timer (treat as user activity)
        console.log('Warning closed - restarting session');
        setShowWarning(false);
        sessionManager.startSession(); // Restart the session with a fresh 5-minute timer
    };

    if (!showWarning) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
                position: 'relative'
            }}>
                {/* Close button */}
                <button
                    onClick={closeWarning}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#999',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = '#f5f5f5';
                        e.target.style.color = '#666';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'none';
                        e.target.style.color = '#999';
                    }}
                    title="Close warning (extends session)"
                >
                    ×
                </button>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#ffc107',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '24px'
                }}>
                    ⏰
                </div>
                
                <h3 style={{
                    margin: '0 0 10px 0',
                    color: '#333',
                    fontSize: '18px',
                    fontWeight: '600'
                }}>
                    Session Expiring Soon
                </h3>
                
                <p style={{
                    margin: '0 0 20px 0',
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: '1.5'
                }}>
                    Your session will expire in <strong>{remainingTime} minute{remainingTime !== 1 ? 's' : ''}</strong>. 
                    Please save your work and log in again when needed.
                </p>
                
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={closeWarning}
                        style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#218838'}
                        onMouseOut={(e) => e.target.style.background = '#28a745'}
                    >
                        Stay Logged In
                    </button>
                    
                    <button
                        onClick={logout}
                        style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#c82333'}
                        onMouseOut={(e) => e.target.style.background = '#dc3545'}
                    >
                        Logout Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionWarning; 