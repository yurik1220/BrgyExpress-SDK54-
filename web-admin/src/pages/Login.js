// Admin Login page
// Flow:
// - Local state for username/password, loading, and error message
// - On submit, POST /api/admin/login using shared axios client
// - On success: persist adminData/adminToken to localStorage, start sessionManager, navigate
// - On failure: display error feedback
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/fetch';
import sessionManager from '../lib/sessionManager';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // Clear error when user types
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Authenticate admin; shared API client will attach base URL
            const response = await api.post(`/api/admin/login`, formData);
            
            if (response.data.success) {
                // Store admin data in localStorage
                localStorage.setItem('adminData', JSON.stringify(response.data.admin));
                localStorage.setItem('adminToken', response.data.token);
                
                // Start session management
                sessionManager.startSession();
                
                // Redirect to dashboard
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            
            
            <div className="login-content">
                <div className="login-header">
                    <div className="logo-container">
                        <img className="header-logo" src={process.env.PUBLIC_URL + '/images/bx-logo.png'} alt="Left Logo" />
                        <div className="title-stack">
                            <h1 className="app-title">BrgyExpress</h1>
                            <p className="app-subtitle">Administrative Dashboard</p>
                        </div>
                        <img className="header-logo" src={process.env.PUBLIC_URL + '/images/bagong-pilipinas.png'} alt="Right Logo" />
                    </div>
                </div>

                <div className="login-form-container">
                    <div className="login-card">
                        <div className="login-card-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to access the administrative dashboard</p>
                        </div>
                        
                        <form className="login-form" onSubmit={handleSubmit}>
                            {error && (
                                <div className="error-message">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="Enter your username"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <button 
                                type="submit" 
                                className="login-button"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="button-spinner"></div>
                                        Signing In...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p>&copy; 2024 BrgyExpress. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 