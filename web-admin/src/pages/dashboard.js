import React, { useEffect, useState } from "react";
import api from "../lib/fetch";
import { Link, useNavigate } from "react-router-dom";
import '../styles/Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                // Use centralized API client; includes auth and configurable base URL
                const response = await api.get("/api/requests");
                console.log('API Response:', response.data);
                setRequests(response.data);
            } catch (err) {
                console.error('API Error:', err);
                setError("Failed to fetch requests");
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Calculate comprehensive stats
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const total = requests.length;

    // Incident report stats
    const incidentReports = requests.filter(r => r.type === 'Incident Report');
    const incidentTotal = incidentReports.length;

    // Recent activity (last 7 requests, sorted by created_at desc)
    const recentActivity = [...requests]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 7);

    // Urgent items (pending requests)
    const urgentItems = requests.filter(r => r.status === 'pending').slice(0, 4);

    // Format time and date for Manila (Asia/Manila timezone)
    const formatManilaTime = () => {
        const manilaTime = new Date(currentTime.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
        const timeString = manilaTime.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = manilaTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        return { timeString, dateString };
    };

    const { timeString, dateString } = formatManilaTime();



    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'pending': return 'warning';
            case 'rejected': return 'danger';
            case 'active': return 'info';
            case 'closed': return 'secondary';
            default: return 'primary';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Document Request': return 'fas fa-file-alt';
            case 'Create ID': return 'fas fa-id-card';
            case 'Incident Report': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-file';
        }
    };

    if (loading) return (
        <div className="dashboard-container">
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="dashboard-container">
            <div className="error-container">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Dashboard</h3>
                <p>{error}</p>
            </div>
        </div>
    );

    // Show empty state if no data
    if (requests.length === 0) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="header-content">
                        <h1>Dashboard</h1>
                        <p>Welcome to BrgyExpress Admin Panel</p>
                    </div>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">
                        <i className="fas fa-chart-line"></i>
                    </div>
                    <h2>No Data Available</h2>
                    <p>There are no requests or reports in the system yet.</p>
                    <p>Data will appear here once users submit requests through the mobile app.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="time-display">
                        <div className="time-main">{timeString}</div>
                        <div className="date-info">{dateString} • Manila Time</div>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="quick-stat">
                        <span className="stat-label">Total Requests</span>
                        <span className="stat-value">{total}</span>
                    </div>
                    <div className="quick-stat">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value warning">{pending}</span>
                    </div>
                    <div className="quick-stat">
                        <span className="stat-label">Today</span>
                        <span className="stat-value info">{requests.filter(r => {
                            const today = new Date().toDateString();
                            return new Date(r.created_at).toDateString() === today;
                        }).length}</span>
                    </div>

                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon">
                        <i className="fas fa-clock"></i>
                    </div>
                    <div className="stat-content">
                        <h3>Pending Requests</h3>
                        <div className="stat-number">{pending}</div>
                        <div className="stat-subtitle">Awaiting review</div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon">
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="stat-content">
                        <h3>Approved</h3>
                        <div className="stat-number">{approved}</div>
                        <div className="stat-subtitle">Successfully processed</div>
                    </div>
                </div>

                <div className="stat-card danger">
                    <div className="stat-icon">
                        <i className="fas fa-times-circle"></i>
                    </div>
                    <div className="stat-content">
                        <h3>Rejected</h3>
                        <div className="stat-number">{rejected}</div>
                        <div className="stat-subtitle">Not approved</div>
                    </div>
                </div>

                <div className="stat-card info">
                    <div className="stat-icon">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="stat-content">
                        <h3>Incident Reports</h3>
                        <div className="stat-number">{incidentTotal}</div>
                        <div className="stat-subtitle">Emergency reports</div>
                    </div>
                </div>
            </div>

            {/* Overview Grid */}
            <div className="overview-grid">
                {/* Left Column - Urgent Items */}
                <div className="overview-left">
                    <div className="overview-card">
                        <div className="card-header">
                            <h3>Urgent Items</h3>
                            <p>Pending requests that need attention</p>
                        </div>
                        <div className="urgent-items">
                            {urgentItems.length === 0 ? (
                                <div className="empty-urgent">
                                    <i className="fas fa-check-circle"></i>
                                    <p>No urgent items</p>
                                    <span>All requests have been processed</span>
                                </div>
                            ) : (
                                urgentItems.map((item) => (
                                    <div className="urgent-item" key={item.id}>
                                        <div className={`item-icon ${getStatusColor(item.status)}`}>
                                            <i className={getTypeIcon(item.type)}></i>
                                        </div>
                                        <div className="item-content">
                                            <h4>{item.type}</h4>
                                            <p>Submitted {new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <Link to={`/${item.type.toLowerCase().replace(' ', '-')}`} className="view-btn">
                                            View
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Recent Activities */}
                <div className="overview-right">
                    <div className="overview-card">
                        <div className="card-header">
                            <h3>Recent Activities</h3>
                            <p>Latest requests and updates</p>
                        </div>
                        <div className="activity-table">
                            <div className="table-header">
                                <div className="header-cell">Type</div>
                                <div className="header-cell">Status</div>
                                <div className="header-cell">Date</div>
                                <div className="header-cell">Action</div>
                            </div>
                            <div className="table-body">
                                {recentActivity.length === 0 ? (
                                    <div className="empty-activity">
                                        <i className="fas fa-inbox"></i>
                                        <p>No recent activity</p>
                                    </div>
                                ) : (
                                    recentActivity.map((item) => (
                                        <div className="table-row" key={item.id}>
                                            <div className="table-cell">
                                                <div className="cell-content">
                                                    <i className={`${getTypeIcon(item.type)} ${getStatusColor(item.status)}`}></i>
                                                    <span>{item.type}</span>
                                                </div>
                                            </div>
                                            <div className="table-cell">
                                                <span className={`status-badge ${getStatusColor(item.status)}`}>
                                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="table-cell">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="table-cell">
                                                <Link to={`/${item.type.toLowerCase().replace(' ', '-')}`} className="view-link">
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;