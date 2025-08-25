// Session Management for Auto-Logout
class SessionManager {
    constructor() {
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        this.sessionTimer = null;
        this.sessionStartTime = null;
        this.isActive = false;
        this.isLoggingOut = false; // Prevent multiple logout calls
        this.init();
    }

    init() {
        // Reset timer on user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, () => this.resetTimer(), true);
        });

        // Check if user is already logged in
        const adminData = localStorage.getItem('adminData');
        const adminToken = localStorage.getItem('adminToken');
        
        if (adminData && adminToken) {
            this.startSession();
        } else {
            // Clear any invalid data
            localStorage.removeItem('adminData');
            localStorage.removeItem('adminToken');
        }
    }

    startSession() {
        this.isActive = true;
        this.isLoggingOut = false; // Reset logout flag
        this.sessionStartTime = Date.now();
        this.resetTimer();
    }

    resetTimer() {
        if (!this.isActive) return;

        // Clear existing timer
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        // Reset session start time
        this.sessionStartTime = Date.now();

        // Set new timer
        this.sessionTimer = setTimeout(() => {
            this.logout();
        }, this.SESSION_TIMEOUT);
    }

    logout(force = false) {
        // Prevent multiple concurrent logout calls unless forced by user action
        if (this.isLoggingOut && !force) {
            return;
        }

        this.isLoggingOut = true;
        this.isActive = false;
        this.sessionStartTime = null;
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        // Call logout endpoint to log the action
        fetch('http://localhost:5000/api/admin/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: JSON.parse(localStorage.getItem('adminData') || '{}').username || 'unknown'
            })
        }).catch(error => {
            console.error('Logout API call failed:', error);
        });

        // Clear localStorage
        localStorage.removeItem('adminData');
        localStorage.removeItem('adminToken');

        // Show notification for interactive contexts, or when forced by user
        if (force || !document.hidden) {
            this.showSessionExpiredNotification();
        }

        // Redirect to login for interactive contexts or forced actions
        if (force || !document.hidden) {
            window.location.replace('/login');
        }
    }

    showSessionExpiredNotification() {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Session expired. Please log in again.</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Get remaining session time in minutes
    getRemainingTime() {
        if (!this.sessionTimer || !this.sessionStartTime) return 0;
        
        const elapsed = Date.now() - this.sessionStartTime;
        const remaining = this.SESSION_TIMEOUT - elapsed;
        return Math.max(0, remaining / 60000); // Convert to minutes
    }

    // Extend session (called when user performs actions)
    extendSession() {
        if (this.isActive) {
            this.resetTimer();
        }
    }

    // Validate session with backend
    async validateSession() {
        try {
            const response = await fetch('http://localhost:5000/api/admin/session', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Session validation failed');
            }

            return true;
        } catch (error) {
            console.error('Session validation error:', error);
            this.logout();
            return false;
        }
    }

    // Check if session is valid
    isSessionValid() {
        const adminData = localStorage.getItem('adminData');
        const adminToken = localStorage.getItem('adminToken');
        return !!(adminData && adminToken && this.isActive);
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager; 