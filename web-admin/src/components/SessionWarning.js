import React, { useState, useEffect } from 'react';
import sessionManager from '../lib/sessionManager';

const SessionWarning = () => {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    useEffect(() => {
        const checkSession = () => {
            if (sessionManager.isSessionValid()) {
                const remaining = sessionManager.getRemainingTime();
                
                // Show warning when less than 5 minutes remaining
                if (remaining <= 5 && remaining > 0) {
                    setRemainingTime(Math.ceil(remaining));
                    setShowWarning(true);
                } else {
                    setShowWarning(false);
                }
            }
        };

        // Check every 30 seconds
        const interval = setInterval(checkSession, 30000);
        
        // Initial check
        checkSession();

        return () => clearInterval(interval);
    }, []);

    const extendSession = () => {
        sessionManager.extendSession();
        setShowWarning(false);
    };

    const logout = () => {
        sessionManager.logout();
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
                textAlign: 'center'
            }}>
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
                    Would you like to extend your session?
                </p>
                
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={extendSession}
                        style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#0056b3'}
                        onMouseOut={(e) => e.target.style.background = '#007bff'}
                    >
                        Extend Session
                    </button>
                    
                    <button
                        onClick={logout}
                        style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#545b62'}
                        onMouseOut={(e) => e.target.style.background = '#6c757d'}
                    >
                        Logout Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionWarning; 