// Session Management for Auto-Logout
class SessionManager {
    constructor() {
        this.SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        this.sessionTimer = null;
        this.sessionStartTime = null;
        this.isActive = false;
        this.isLoggingOut = false; // Prevent multiple logout calls
        this.timerEndTime = null; // Track when the timer will expire
        this.init();
    }

    init() {
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
        this.timerEndTime = Date.now() + this.SESSION_TIMEOUT;
        
        // Clear existing timer
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        // Set fixed timeout - session will expire after 5 minutes regardless of activity
        this.sessionTimer = setTimeout(() => {
            this.logout();
        }, this.SESSION_TIMEOUT);
        
        console.log('Session started, will expire at:', new Date(this.timerEndTime).toLocaleTimeString());
    }

    logout(force = false) {
        // Prevent multiple concurrent logout calls unless forced by user action
        if (this.isLoggingOut && !force) {
            return;
        }

        this.isLoggingOut = true;
        this.isActive = false;
        this.sessionStartTime = null;
        this.timerEndTime = null;
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        console.log('Session logged out');

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
        if (!this.timerEndTime) return 0;
        
        const now = Date.now();
        const remaining = this.timerEndTime - now;
        const remainingMinutes = Math.max(0, remaining / 60000); // Convert to minutes
        
        console.log('Remaining time:', remainingMinutes.toFixed(2), 'minutes');
        return remainingMinutes;
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

    // Check if session is about to expire (less than 1 minute)
    isSessionExpiringSoon() {
        if (!this.isSessionValid()) return false;
        const remaining = this.getRemainingTime();
        return remaining <= 1 && remaining > 0;
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager; 