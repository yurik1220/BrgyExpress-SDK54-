import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
            const response = await axios.post(`http://localhost:5000/api/admin/login`, formData);
            
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
            <div className="login-background">
                <div className="login-overlay"></div>
            </div>
            
            <div className="login-content">
                <div className="login-header">
                    <div className="logo-container">
                        <div className="logo-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h1 className="app-title">BrgyExpress</h1>
                        <p className="app-subtitle">Administrative Dashboard</p>
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