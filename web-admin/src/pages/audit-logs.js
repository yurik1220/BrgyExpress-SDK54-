import React, { useState, useEffect } from 'react';
import api from '../lib/fetch';
import '../styles/AuditLogs.css';

// Quick filter presets
const QUICK_FILTERS = [
    { label: 'Show All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Last 7 Days', value: 'recent' },
    { label: 'Last 30 Days', value: 'month30' }
];

// Action type filters
const ACTION_FILTERS = [
    { label: 'All Actions', value: '' },
    { label: 'Login', value: 'Admin Login' },
    { label: 'Logout', value: 'Admin Logout' },
    { label: 'Updates', value: 'Update' }
];

// Status filters
const STATUS_FILTERS = [
    { label: 'All Status', value: 'all' },
    { label: 'Success Only', value: 'success' },
    { label: 'Failed Only', value: 'failed' }
];

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        action: '',
        admin_username: '',
        start_date: '',
        end_date: '',
        status: 'all'
    });
    const [selectedQuickFilter, setSelectedQuickFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            });

            const response = await api.get(`/api/admin/audit-logs?${params}`);
            
            if (response.data.success) {
                // Keep only Login, Logout, and any Update actions
                const filtered = (response.data.data || []).filter(log => {
                    const action = log?.action || '';
                    return action === 'Admin Login' || action === 'Admin Logout' || action.includes('Update');
                });
                setLogs(filtered);
                setPagination(response.data.pagination);
            } else {
                setError('Failed to fetch audit logs');
            }
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to fetch audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            admin_username: '',
            start_date: '',
            end_date: '',
            status: 'all'
        });
        setSelectedQuickFilter('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const applyQuickFilter = (filterValue) => {
        setSelectedQuickFilter(filterValue);
        
        const today = new Date();
        const startOfWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        let newFilters = {
            action: '',
            admin_username: '',
            start_date: '',
            end_date: '',
            status: 'all'
        };
        
        switch (filterValue) {
            case 'all':
                // Clear all filters - show everything
                break;
            case 'today':
                newFilters.start_date = today.toISOString().split('T')[0];
                newFilters.end_date = today.toISOString().split('T')[0];
                break;
            case 'week':
                // Get start of current week (Monday)
                const dayOfWeek = today.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() + daysToMonday);
                startOfWeek.setHours(0, 0, 0, 0);
                
                newFilters.start_date = startOfWeek.toISOString().split('T')[0];
                newFilters.end_date = today.toISOString().split('T')[0];
                break;
            case 'month':
                newFilters.start_date = startOfMonth.toISOString().split('T')[0];
                newFilters.end_date = today.toISOString().split('T')[0];
                break;
            case 'recent':
                newFilters.start_date = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
                newFilters.end_date = today.toISOString().split('T')[0];
                break;
            case 'month30':
                newFilters.start_date = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
                newFilters.end_date = today.toISOString().split('T')[0];
                break;
            default:
                break;
        }
        
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getActionColor = (action) => {
        // Categorize actions into three main types
        if (action === 'Admin Login') return '#28a745'; // Green for login
        if (action === 'Admin Logout') return '#6c757d'; // Gray for logout
        if (action && action.includes('Update')) return '#007bff'; // Blue for all updates
        return '#6c757d'; // Default gray
    };

    const getActionIcon = (action) => {
        // Categorize actions into three main types
        if (action === 'Admin Login') return '•';
        if (action === 'Admin Logout') return '•';
        if (action && action.includes('Update')) return '•';
        return '•';
    };

    const getStatusFromDetails = (details) => {
        try {
            const parsed = JSON.parse(details);
            // Check if responseSuccess is explicitly false, otherwise consider it success
            return parsed.responseSuccess === false ? 'Failed' : 'Success';
        } catch {
            return 'Unknown';
        }
    };

    const getStatusClass = (details) => {
        try {
            const parsed = JSON.parse(details);
            // Check if responseSuccess is explicitly false, otherwise consider it success
            return parsed.responseSuccess === false ? 'failed' : 'success';
        } catch {
            return '';
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="audit-logs-container">
                <div className="loading">Loading audit logs...</div>
            </div>
        );
    }

    return (
        <div className="audit-logs-container">
            <div className="audit-logs-header">
                <div className="header-content">
                    <h1>Audit Logs</h1>
                    <p>Track all administrative actions and system activities</p>
                </div>
            </div>


            {/* Quick Filters */}
            <div className="quick-filters">
                <h3>Quick Filters</h3>
                <div className="quick-filter-buttons">
                    {QUICK_FILTERS.map(filter => (
                        <button
                            key={filter.value}
                            className={`quick-filter-btn ${selectedQuickFilter === filter.value ? 'active' : ''}`}
                            onClick={() => applyQuickFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                    <button 
                        className="toggle-filters-btn"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        {showFilters ? 'Hide' : 'Show'} Advanced Filters
                    </button>
                </div>
                {selectedQuickFilter && (
                    <div className="active-filter-info">
                        <span>Active filter: {QUICK_FILTERS.find(f => f.value === selectedQuickFilter)?.label}</span>
                        <button 
                            className="clear-quick-filter-btn"
                            onClick={() => applyQuickFilter('all')}
                        >
                            Clear Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="audit-filters">
                    <div className="filter-section">
                        <h4>Time Range</h4>
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Start Date:</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={filters.start_date}
                                    onChange={handleFilterChange}
                                />
                            </div>
                            <div className="filter-group">
                                <label>End Date:</label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={filters.end_date}
                                    onChange={handleFilterChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <h4>Action Type</h4>
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Action:</label>
                                <select
                                    name="action"
                                    value={filters.action}
                                    onChange={handleFilterChange}
                                >
                                    {ACTION_FILTERS.map(filter => (
                                        <option key={filter.value} value={filter.value}>
                                            {filter.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Status:</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                >
                                    {STATUS_FILTERS.map(filter => (
                                        <option key={filter.value} value={filter.value}>
                                            {filter.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="filter-section">
                        <div className="filter-row">
                            <div className="filter-group">
                                <label>Admin Username:</label>
                                <input
                                    type="text"
                                    name="admin_username"
                                    value={filters.admin_username}
                                    onChange={handleFilterChange}
                                    placeholder="Filter by username..."
                                />
                            </div>
                            <div className="filter-group">
                                <button className="clear-filters-btn" onClick={clearFilters}>
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="audit-logs-table-container">
                <table className="audit-logs-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="timestamp">
                                    <div className="timestamp-content">
                                        <div className="time">{formatTimestamp(log.timestamp)}</div>
                                        <div className="date">{new Date(log.timestamp).toLocaleDateString()}</div>
                                    </div>
                                </td>
                                <td className="admin">
                                    <div className="admin-info">
                                        <div className="admin-name">{log.admin_username || 'System'}</div>
                                        <div className="admin-role">{log.admin_role || 'Administrator'}</div>
                                    </div>
                                </td>
                                <td className="action">
                                    <div className="action-content">
                                        <span className="action-icon">{getActionIcon(log.action)}</span>
                                        <span 
                                            className="action-badge"
                                            style={{ backgroundColor: getActionColor(log.action) }}
                                        >
                                            {log.action === 'Admin Login' ? 'Login' : 
                                             log.action === 'Admin Logout' ? 'Logout' : 
                                             log.action}
                                        </span>
                                    </div>
                                </td>
                                <td className="status">
                                    <span className={`status-badge ${getStatusClass(log.details)}`}>
                                        {getStatusFromDetails(log.details)}
                                    </span>
                                </td>
                                <td className="details">
                                    <button 
                                        className="view-details-btn"
                                        onClick={() => {
                                            try {
                                                const details = JSON.parse(log.details);
                                                const formattedDetails = JSON.stringify(details, null, 2);
                                                const modal = window.open('', '_blank', 'width=600,height=400');
                                                modal.document.write(`
                                                    <html>
                                                        <head><title>Audit Log Details</title></head>
                                                        <body style="font-family: monospace; padding: 20px; background: #f5f5f5;">
                                                            <h3>Audit Log Details</h3>
                                                            <pre style="background: white; padding: 15px; border-radius: 5px; overflow: auto;">${formattedDetails}</pre>
                                                        </body>
                                                    </html>
                                                `);
                                            } catch {
                                                alert(log.details || 'No details available');
                                            }
                                        }}
                                        title="View detailed information"
                                    >
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="pagination-btn"
                    >
                        Previous
                    </button>
                    
                    <span className="pagination-info">
                        Page {pagination.page} of {pagination.totalPages} 
                        ({pagination.total} total logs)
                    </span>
                    
                    <button 
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="pagination-btn"
                    >
                        Next
                    </button>
                </div>
            )}

            {logs.length === 0 && !loading && (
                <div className="no-logs">
                    No audit logs found matching your criteria.
                </div>
            )}
        </div>
    );
};

export default AuditLogs; 