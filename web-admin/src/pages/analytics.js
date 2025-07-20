import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import '../styles/Analytics.css';

const Analytics = () => {
    const [overviewData, setOverviewData] = useState(null);
    const [detailedData, setDetailedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('30'); // days
    const [activeTab, setActiveTab] = useState('overview');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    
    // Filter states
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: '',
        status: '',
        location: ''
    });

    // Fetch overview analytics
    const fetchOverviewAnalytics = useCallback(async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/analytics/overview?days=${timeRange}`);
            console.log('Overview Analytics Response:', response.data);
            setOverviewData(response.data);
        } catch (err) {
            console.error('Overview Analytics Error:', err);
            setError("Failed to fetch overview analytics");
        }
    }, [timeRange]);

    // Fetch detailed analytics
    const fetchDetailedAnalytics = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.location) params.append('location', filters.location);

            const response = await axios.get(`http://localhost:5000/api/analytics/detailed?${params.toString()}`);
            console.log('Detailed Analytics Response:', response.data);
            setDetailedData(response.data);
        } catch (err) {
            console.error('Detailed Analytics Error:', err);
            setError("Failed to fetch detailed analytics");
        }
    }, [filters]);

    // Export data
    const exportData = async (format) => {
        try {
            const params = new URLSearchParams();
            params.append('format', format);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);
            if (filters.status) params.append('status', filters.status);
            if (filters.location) params.append('location', filters.location);

            const response = await axios.get(`http://localhost:5000/api/analytics/export?${params.toString()}`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export Error:', err);
            alert('Failed to export data');
        }
    };

    // Calculate month-over-month change
    const calculateMoMChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    useEffect(() => {
        fetchOverviewAnalytics();
    }, [timeRange, fetchOverviewAnalytics]);

    useEffect(() => {
        if (activeTab === 'detailed') {
            fetchDetailedAnalytics();
        }
    }, [activeTab, filters, fetchDetailedAnalytics]);

    useEffect(() => {
        setLoading(false);
    }, [overviewData, detailedData]);

    if (loading) return (
        <div className="analytics-container">
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading analytics data...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="analytics-container">
            <div className="error-container">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Analytics</h3>
                <p>{error}</p>
            </div>
        </div>
    );

    return (
        <div className="analytics-container">
            {/* Header Section */}
            <div className="analytics-header">
                <div className="header-content">
                    <h1>Analytics Dashboard</h1>
                    <p>Comprehensive insights and data visualization for BrgyExpress</p>
                </div>
                <div className="header-controls">
                    <div className="time-range-selector">
                        <label htmlFor="timeRange">Time Range:</label>
                        <select 
                            id="timeRange" 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                    </div>
                    <div className="export-buttons">
                        <button onClick={() => exportData('csv')} className="export-btn csv">
                            <i className="fas fa-download"></i>
                            Export CSV
                        </button>
                        <button 
                            className="advanced-toggle-btn"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        >
                            <i className="fas fa-cog"></i>
                            Advanced Options
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Options Section */}
            {showAdvancedOptions && (
                <div className="advanced-options">
                    <div className="advanced-content">
                        <h3>Advanced Export Options</h3>
                        <p>Export detailed data in JSON format for technical analysis</p>
                        <button onClick={() => exportData('json')} className="export-btn json">
                            <i className="fas fa-code"></i>
                            Export JSON
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="analytics-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <i className="fas fa-chart-pie"></i>
                    Overview
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'detailed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detailed')}
                >
                    <i className="fas fa-chart-line"></i>
                    Detailed Analysis
                </button>
            </div>

            {activeTab === 'overview' && overviewData && (
                <div className="overview-section">
                    {/* Overview Stats with MoM Indicators */}
                    <div className="overview-stats">
                        <div className="stat-card primary">
                            <div className="stat-icon">
                                <i className="fas fa-chart-line"></i>
                            </div>
                            <div className="stat-content">
                                <h3>Total Requests</h3>
                                <div className="stat-number">{overviewData.analytics.totalRequests}</div>
                                <div className="stat-subtitle">In selected time range</div>
                                {overviewData.analytics.previousPeriod && (
                                    <div className={`mom-indicator ${overviewData.analytics.momChange >= 0 ? 'positive' : 'negative'}`}>
                                        <i className={`fas fa-arrow-${overviewData.analytics.momChange >= 0 ? 'up' : 'down'}`}></i>
                                        {Math.abs(overviewData.analytics.momChange)}% vs previous period
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="stat-card success">
                            <div className="stat-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="stat-content">
                                <h3>Approval Rate</h3>
                                <div className="stat-number">
                                    {overviewData.analytics.totalRequests > 0 
                                        ? Math.round((overviewData.analytics.statusDistribution.approved / overviewData.analytics.totalRequests) * 100) 
                                        : 0}%
                                </div>
                                <div className="stat-subtitle">Successfully processed</div>
                            </div>
                        </div>

                        <div className="stat-card info">
                            <div className="stat-icon">
                                <i className="fas fa-clock"></i>
                            </div>
                            <div className="stat-content">
                                <h3>Avg Processing Time</h3>
                                <div className="stat-number">{overviewData.analytics.averageProcessingTime}h</div>
                                <div className="stat-subtitle">Hours to process</div>
                                {overviewData.analytics.previousProcessingTime && (
                                    <div className={`mom-indicator ${overviewData.analytics.processingTimeChange <= 0 ? 'positive' : 'negative'}`}>
                                        <i className={`fas fa-arrow-${overviewData.analytics.processingTimeChange <= 0 ? 'down' : 'up'}`}></i>
                                        {Math.abs(overviewData.analytics.processingTimeChange)}% vs previous period
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="stat-card warning">
                            <div className="stat-icon">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                            <div className="stat-content">
                                <h3>Pending Requests</h3>
                                <div className="stat-number">{overviewData.analytics.statusDistribution.pending}</div>
                                <div className="stat-subtitle">Awaiting review</div>
                            </div>
                        </div>
                    </div>

                    {/* Simplified Charts Grid */}
                    <div className="charts-grid">
                        {/* Request Type Distribution - Pie Chart Only */}
                        <div className="chart-card">
                            <h3>Request Type Distribution</h3>
                            <div className="chart-content">
                                <div className="pie-chart">
                                    <div className="pie-segment document" style={{
                                        transform: `rotate(${overviewData.analytics.requestTypes['Document Request'] / overviewData.analytics.totalRequests * 360}deg)`
                                    }}>
                                        <span className="segment-label">Document</span>
                                        <span className="segment-value">{overviewData.analytics.requestTypes['Document Request']}</span>
                                    </div>
                                    <div className="pie-segment id" style={{
                                        transform: `rotate(${overviewData.analytics.requestTypes['Create ID'] / overviewData.analytics.totalRequests * 360}deg)`
                                    }}>
                                        <span className="segment-label">ID</span>
                                        <span className="segment-value">{overviewData.analytics.requestTypes['Create ID']}</span>
                                    </div>
                                    <div className="pie-segment incident" style={{
                                        transform: `rotate(${overviewData.analytics.requestTypes['Incident Report'] / overviewData.analytics.totalRequests * 360}deg)`
                                    }}>
                                        <span className="segment-label">Incident</span>
                                        <span className="segment-value">{overviewData.analytics.requestTypes['Incident Report']}</span>
                                    </div>
                                </div>
                                <div className="chart-legend">
                                    <div className="legend-item">
                                        <span className="legend-color document"></span>
                                        <span>Document Requests ({overviewData.analytics.requestTypes['Document Request']})</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="legend-color id"></span>
                                        <span>ID Requests ({overviewData.analytics.requestTypes['Create ID']})</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="legend-color incident"></span>
                                        <span>Incident Reports ({overviewData.analytics.requestTypes['Incident Report']})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Daily Trends - Bar Chart Only */}
                        <div className="chart-card">
                            <h3>Daily Trends</h3>
                            <div className="chart-content">
                                <div className="bar-chart">
                                    {Object.entries(overviewData.analytics.dailyTrends).slice(-7).map(([date, count], index) => (
                                        <div key={index} className="bar-group">
                                            <div className="bar-label">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            <div className="bar-container">
                                                <div 
                                                    className="bar" 
                                                    style={{ height: `${Math.max(count * 10, 20)}px` }}
                                                >
                                                    <span className="bar-value">{count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Peak Hours - Simplified */}
                        <div className="chart-card">
                            <h3>Peak Hours Analysis</h3>
                            <div className="chart-content">
                                <div className="peak-hours-chart">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const count = overviewData.analytics.peakHours[hour] || 0;
                                        return (
                                            <div key={hour} className="hour-bar">
                                                <div className="hour-label">{hour}:00</div>
                                                <div className="hour-container">
                                                    <div 
                                                        className="hour-fill" 
                                                        style={{ height: `${Math.max(count * 5, 5)}px` }}
                                                    >
                                                        <span className="hour-value">{count}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Top Active Locations */}
                        <div className="chart-card">
                            <h3>Most Active Areas</h3>
                            <div className="chart-content">
                                <div className="location-list">
                                    {Object.entries(overviewData.analytics.locationActivity || {})
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 5)
                                        .map(([location, count], index) => (
                                        <div key={index} className="location-item">
                                            <div className="location-rank">#{index + 1}</div>
                                            <div className="location-name">{location || 'Unknown'}</div>
                                            <div className="location-count">{count} requests</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="recent-activity">
                        <h3>Recent Activity</h3>
                        <div className="activity-list">
                            {overviewData.analytics.recentActivity.map((activity, index) => (
                                <div key={index} className="activity-item">
                                    <div className="activity-icon">
                                        <i className={`fas ${getTypeIcon(activity.type)}`}></i>
                                    </div>
                                    <div className="activity-content">
                                        <div className="activity-title">{activity.type}</div>
                                        <div className="activity-details">
                                            <span className={`status-badge ${activity.status}`}>{activity.status}</span>
                                            <span className="activity-time">
                                                {new Date(activity.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'detailed' && (
                <div className="detailed-section">
                    {/* Enhanced Filters */}
                    <div className="filters-section">
                        <h3>Filters</h3>
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>Start Date:</label>
                                <input 
                                    type="date" 
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                                />
                            </div>
                            <div className="filter-group">
                                <label>End Date:</label>
                                <input 
                                    type="date" 
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                                />
                            </div>
                            <div className="filter-group">
                                <label>Request Type:</label>
                                <select 
                                    value={filters.type}
                                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                                >
                                    <option value="">All Types</option>
                                    <option value="Document Request">Document Request</option>
                                    <option value="Create ID">Create ID</option>
                                    <option value="Incident Report">Incident Report</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Status:</label>
                                <select 
                                    value={filters.status}
                                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Location/Zone:</label>
                                <select 
                                    value={filters.location}
                                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                                >
                                    <option value="">All Locations</option>
                                    <option value="Purok 1">Purok 1</option>
                                    <option value="Purok 2">Purok 2</option>
                                    <option value="Purok 3">Purok 3</option>
                                    <option value="Purok 4">Purok 4</option>
                                    <option value="Purok 5">Purok 5</option>
                                    <option value="Purok 6">Purok 6</option>
                                    <option value="Purok 7">Purok 7</option>
                                    <option value="Purok 8">Purok 8</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            className="apply-filters-btn"
                            onClick={fetchDetailedAnalytics}
                        >
                            <i className="fas fa-filter"></i>
                            Apply Filters
                        </button>
                    </div>

                    {/* Detailed Results */}
                    {detailedData && (
                        <div className="detailed-results">
                            <div className="results-summary">
                                <h3>Filtered Results</h3>
                                <p>Showing {detailedData.analytics.totalRequests} requests</p>
                            </div>

                            {/* Turnaround Time per Request Type */}
                            <div className="chart-card">
                                <h3>Turnaround Time by Request Type</h3>
                                <div className="chart-content">
                                    <div className="turnaround-times">
                                        {Object.entries(detailedData.analytics.turnaroundByType || {}).map(([type, times], index) => (
                                            <div key={index} className="turnaround-item">
                                                <div className="turnaround-header">
                                                    <i className={`fas ${getTypeIcon(type)}`}></i>
                                                    <span className="turnaround-type">{type}</span>
                                                </div>
                                                <div className="turnaround-stats">
                                                    <div className="turnaround-stat">
                                                        <span className="stat-label">Average:</span>
                                                        <span className="stat-value">{times.average || 0}h</span>
                                                    </div>
                                                    <div className="turnaround-stat">
                                                        <span className="stat-label">Fastest:</span>
                                                        <span className="stat-value fastest">{times.fastest || 0}h</span>
                                                    </div>
                                                    <div className="turnaround-stat">
                                                        <span className="stat-label">Slowest:</span>
                                                        <span className="stat-value slowest">{times.slowest || 0}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Rejection Reasons Summary */}
                            <div className="chart-card">
                                <h3>Rejection Reasons Summary</h3>
                                <div className="chart-content">
                                    <div className="rejection-reasons">
                                        {Object.entries(detailedData.analytics.rejectionReasons || {}).map(([reason, count], index) => (
                                            <div key={index} className="rejection-item">
                                                <div className="rejection-reason">{reason}</div>
                                                <div className="rejection-bar-container">
                                                    <div 
                                                        className="rejection-bar" 
                                                        style={{ width: `${(count / Math.max(...Object.values(detailedData.analytics.rejectionReasons || {}))) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <div className="rejection-count">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* User Activity */}
                            <div className="chart-card">
                                <h3>User Activity</h3>
                                <div className="chart-content">
                                    <div className="user-activity-list">
                                        {Object.entries(detailedData.analytics.userActivity)
                                            .sort(([,a], [,b]) => b - a)
                                            .slice(0, 10)
                                            .map(([user, count], index) => (
                                            <div key={index} className="user-activity-item">
                                                <div className="user-rank">#{index + 1}</div>
                                                <div className="user-name">{user}</div>
                                                <div className="user-count">{count} requests</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Location-based Activity */}
                            <div className="chart-card">
                                <h3>Location-based Activity</h3>
                                <div className="chart-content">
                                    <div className="location-activity-list">
                                        {Object.entries(detailedData.analytics.locationActivity || {})
                                            .sort(([,a], [,b]) => b - a)
                                            .slice(0, 8)
                                            .map(([location, count], index) => (
                                            <div key={index} className="location-activity-item">
                                                <div className="location-rank">#{index + 1}</div>
                                                <div className="location-name">{location || 'Unknown'}</div>
                                                <div className="location-count">{count} requests</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper function to get icon for request type
const getTypeIcon = (type) => {
    switch (type) {
        case 'Document Request': return 'fa-file-alt';
        case 'Create ID': return 'fa-id-card';
        case 'Incident Report': return 'fa-exclamation-triangle';
        default: return 'fa-file';
    }
};

export default Analytics; 