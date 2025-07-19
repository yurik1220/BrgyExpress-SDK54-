import React, { useState, useEffect } from 'react';
import api from '../lib/fetch';
import '../styles/AuditLogs.css';

// Quick filter presets
const QUICK_FILTERS = [
    { label: 'Show All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Recent Activity', value: 'recent' },
    { label: 'Logins', value: 'logins' },
    { label: 'Approvals', value: 'approvals' },
    { label: 'Rejections', value: 'rejections' }
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
        end_date: ''
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
                setLogs(response.data.data);
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
            end_date: ''
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
            end_date: ''
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
            case 'logins':
                newFilters.action = 'Admin Login';
                break;
            case 'approvals':
                newFilters.action = 'Update';
                break;
            case 'rejections':
                newFilters.action = 'Update';
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
        const actionColors = {
            'Admin Login': '#28a745',
            'Admin Logout': '#6c757d',
            'Admin Registration': '#17a2b8',
            'Admin Creation': '#007bff',
            'Create Announcement': '#28a745',
            'Delete Announcement': '#dc3545',
            'Update Announcement': '#ffc107',
            'Update Document Request': '#fd7e14',
            'Update ID Request': '#6f42c1',
            'Update Incident Report': '#e83e8c'
        };
        return actionColors[action] || '#6c757d';
    };

    const getActionIcon = (action) => {
        const actionIcons = {
            'Admin Login': '🔑',
            'Admin Logout': '🚪',
            'Admin Registration': '👤',
            'Admin Creation': '➕',
            'Create Announcement': '📢',
            'Delete Announcement': '🗑️',
            'Update Announcement': '✏️',
            'Update Document Request': '📄',
            'Update ID Request': '🆔',
            'Update Incident Report': '🚨'
        };
        return actionIcons[action] || '📋';
    };

    const getStatusFromDetails = (details) => {
        try {
            const parsed = JSON.parse(details);
            // Check if responseSuccess is explicitly false, otherwise consider it success
            return parsed.responseSuccess === false ? '❌ Failed' : '✅ Success';
        } catch {
            return '❓ Unknown';
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
                <h1>📋 Audit Logs</h1>
                <p>Track all administrative actions and system activities</p>
                <div className="audit-instructions">
                    <h4>💡 How to use:</h4>
                    <ul>
                        <li><strong>Quick Filters:</strong> Click buttons to filter by common time periods and actions</li>
                        <li><strong>Advanced Filters:</strong> Show/hide detailed filtering options</li>
                        <li><strong>View Details:</strong> Click the eye icon to see full log information</li>
                        <li><strong>Status Colors:</strong> Green = Success, Red = Failed</li>
                        <li><strong>Action Icons:</strong> Visual indicators for different activities</li>
                        <li><strong>Comprehensive Tracking:</strong> All admin actions are logged including logins, approvals, rejections, and content management</li>
                    </ul>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="audit-stats">
                <div className="stat-card">
                    <div className="stat-number">{pagination.total}</div>
                    <div className="stat-label">Total Logs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{logs.filter(log => {
                        try {
                            const parsed = JSON.parse(log.details);
                            return parsed.responseSuccess !== false; // Consider success unless explicitly false
                        } catch {
                            return true; // If we can't parse, assume success
                        }
                    }).length}</div>
                    <div className="stat-label">Successful Actions</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{logs.filter(log => log.action === 'Admin Login').length}</div>
                    <div className="stat-label">Login Attempts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{new Set(logs.map(log => log.admin_username)).size}</div>
                    <div className="stat-label">Active Admins</div>
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

            {/* Advanced Filters Toggle */}
            <div className="advanced-filters-toggle">
                <button 
                    className="toggle-filters-btn"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    {showFilters ? '🔽 Hide' : '🔼 Show'} Advanced Filters
                </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="audit-filters">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Action:</label>
                            <input
                                type="text"
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                                placeholder="Filter by action..."
                            />
                        </div>
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
                    </div>
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
                        <button className="clear-filters-btn" onClick={clearFilters}>
                            🗑️ Clear All Filters
                        </button>
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
                            <th>📅 Time</th>
                            <th>👤 Admin</th>
                            <th>🎯 Action</th>
                            <th>✅ Status</th>
                            <th>🌐 IP Address</th>
                            <th>📋 Details</th>
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
                                        <div className="admin-name">{log.admin_username || 'Unknown'}</div>
                                        <div className="admin-id">ID: {log.admin_id || 'N/A'}</div>
                                    </div>
                                </td>
                                <td className="action">
                                    <div className="action-content">
                                        <span className="action-icon">{getActionIcon(log.action)}</span>
                                        <span 
                                            className="action-badge"
                                            style={{ backgroundColor: getActionColor(log.action) }}
                                        >
                                            {log.action}
                                        </span>
                                    </div>
                                </td>
                                <td className="status">
                                    <span className={`status-badge ${getStatusClass(log.details)}`}>
                                        {getStatusFromDetails(log.details)}
                                    </span>
                                </td>
                                <td className="ip">
                                    <div className="ip-info">
                                        <div className="ip-address">{log.ip_address || 'N/A'}</div>
                                        <div className="user-agent">{log.user_agent ? log.user_agent.substring(0, 30) + '...' : 'N/A'}</div>
                                    </div>
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
                                        👁️ View
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