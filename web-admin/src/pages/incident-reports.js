import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/IncidentReports.css";

const IncidentReports = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState("");
    const [pendingIncidents, setPendingIncidents] = useState([]);
    const [activeIncidents, setActiveIncidents] = useState([]);
    const [closedIncidents, setClosedIncidents] = useState([]);
    const [mapUrl, setMapUrl] = useState("");
    const [searchRef, setSearchRef] = useState("");

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                // Filter only incident reports from the response
                const allIncidents = response.data.filter(item => item.type === 'Incident Report');
                setPendingIncidents(allIncidents.filter(i => !i.status || i.status === 'pending'));
                setActiveIncidents(allIncidents.filter(i => i.status === 'in_progress'));
                setClosedIncidents(allIncidents.filter(i => i.status === 'closed'));
            } catch (error) {
                setError("Error fetching incident reports");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    useEffect(() => {
        if (selectedReport?.location) {
            const [longitude, latitude] = selectedReport.location.split(",").map(Number);
            setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [selectedReport]);

    const handleAction = async () => {
        try {
            const payload = {
                status: actionType === "investigating" ? "in_progress" : "closed",
                resolved_at: new Date().toISOString()
            };

            const response = await axios.patch(
                `http://localhost:5000/api/incidents/${selectedReport.id}`,
                payload
            );

            if (response.data) {
                // Update the respective state based on the new status
                if (actionType === "investigating") {
                    setPendingIncidents(prev => prev.filter(i => i.id !== selectedReport.id));
                    setActiveIncidents(prev => [...prev, response.data]);
                } else {
                    setActiveIncidents(prev => prev.filter(i => i.id !== selectedReport.id));
                    setClosedIncidents(prev => [...prev, response.data]);
                }
                
                setSelectedReport(null);
                setShowActionModal(false);
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update incident status");
        }
    };

    const getCurrentIncidents = () => {
        let incidents = [];
        switch (activeTab) {
            case "pending":
                incidents = pendingIncidents;
                break;
            case "active":
                incidents = activeIncidents;
                break;
            case "closed":
                incidents = closedIncidents;
                break;
            default:
                incidents = [];
        }
        if (searchRef.trim() !== "") {
            return incidents.filter(i =>
                i.reference_number && i.reference_number.toLowerCase().includes(searchRef.trim().toLowerCase())
            );
        }
        return incidents;
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading incident reports...</p>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="incident-reports-container">
            {/* Enhanced Header */}
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-exclamation-triangle header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>Incident Reports</h1>
                        <p>Monitor and manage emergency reports from residents</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-badge pending">
                        <div className="stat-icon">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{pendingIncidents.length}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-badge active">
                        <div className="stat-icon">
                            <i className="fas fa-search"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{activeIncidents.length}</span>
                            <span className="stat-label">Active</span>
                        </div>
                    </div>
                    <div className="stat-badge total">
                        <div className="stat-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{pendingIncidents.length + activeIncidents.length + closedIncidents.length}</span>
                            <span className="stat-label">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="tabs-container">
                <div className="tabs-header">
                    <div className="tabs">
                        <button
                            className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
                            onClick={() => setActiveTab("pending")}
                        >
                            <i className="fas fa-clock"></i>
                            <span>Pending Reports</span>
                            <span className="tab-count">{pendingIncidents.length}</span>
                        </button>
                        <button
                            className={`tab-button ${activeTab === "active" ? "active" : ""}`}
                            onClick={() => setActiveTab("active")}
                        >
                            <i className="fas fa-search"></i>
                            <span>Active Reports</span>
                            <span className="tab-count">{activeIncidents.length}</span>
                        </button>
                        <button
                            className={`tab-button ${activeTab === "closed" ? "active" : ""}`}
                            onClick={() => setActiveTab("closed")}
                        >
                            <i className="fas fa-check-circle"></i>
                            <span>Closed Reports</span>
                            <span className="tab-count">{closedIncidents.length}</span>
                        </button>
                    </div>

                    <div className="search-container">
                        <div className="search-wrapper">
                            <i className="fas fa-search search-icon"></i>
                            <input
                                type="text"
                                placeholder="Search by Reference Number..."
                                value={searchRef}
                                onChange={e => setSearchRef(e.target.value)}
                                className="search-input"
                            />
                            {searchRef && (
                                <button 
                                    className="clear-search"
                                    onClick={() => setSearchRef("")}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Reports Grid */}
            <div className="reports-grid">
                {getCurrentIncidents().length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <i className="fas fa-shield-check"></i>
                        </div>
                        <h3>No {activeTab} Reports</h3>
                        <p>All incident reports have been processed!</p>
                    </div>
                ) : (
                    getCurrentIncidents().map((report) => (
                        <div
                            key={report.id}
                            className={`report-card ${report.status || 'pending'}-card`}
                            onClick={() => setSelectedReport(report)}
                        >
                            <div className="card-header">
                                <div className="report-info">
                                    <span className="report-type">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        Incident Report
                                    </span>
                                    <span className="reference-number">
                                        #{report.reference_number}
                                    </span>
                                </div>
                                <span className={`status-badge ${report.status || 'pending'}`}>
                                    <i className={`fas fa-${report.status === 'in_progress' ? 'search' : report.status === 'closed' ? 'check' : 'clock'}`}></i>
                                    {report.status || 'Pending'}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-section">
                                    <div className="info-row">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span className="label">Title:</span>
                                        <span className="value">{report.title}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <span className="label">Location:</span>
                                        <span className="value">{report.location}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-user"></i>
                                        <span className="label">Reporter:</span>
                                        <span className="value">{report.clerk_id}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-calendar"></i>
                                        <span className="label">Reported:</span>
                                        <span className="value">{new Date(report.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="info-row description">
                                        <i className="fas fa-comment"></i>
                                        <span className="label">Description:</span>
                                        <span className="value">{report.description}</span>
                                    </div>
                                </div>
                                {(report.status === 'pending' || report.status === 'in_progress') && (
                                    <div className="card-actions">
                                        {report.status === 'pending' && (
                                            <button 
                                                className="action-btn investigate"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReport(report);
                                                    setActionType("investigating");
                                                    setShowActionModal(true);
                                                }}
                                            >
                                                <i className="fas fa-search"></i>
                                                Start Investigation
                                            </button>
                                        )}
                                        {report.status === 'in_progress' && (
                                            <button 
                                                className="action-btn close"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReport(report);
                                                    setActionType("resolved");
                                                    setShowActionModal(true);
                                                }}
                                            >
                                                <i className="fas fa-check"></i>
                                                Mark Resolved
                                            </button>
                                        )}
                                        <button 
                                            className="action-btn view-map"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (report.location) {
                                                    const [longitude, latitude] = report.location.split(",").map(Number);
                                                    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
                                                }
                                            }}
                                        >
                                            <i className="fas fa-map"></i>
                                            View Map
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Enhanced Action Modal */}
            {showActionModal && selectedReport && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {actionType === "investigating" ? "Start Investigation" : "Mark as Resolved"}
                            </h3>
                            <button className="close-btn" onClick={() => setShowActionModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                {selectedReport?.media_url && (
                                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                        {/\.(mp4|webm|ogg)$/i.test(selectedReport.media_url) ? (
                                            <video controls style={{ width: '100%', maxHeight: 360 }}>
                                                <source src={`http://localhost:5000${selectedReport.media_url}`} />
                                                Your browser does not support the video tag.
                                            </video>
                                        ) : (
                                            <img src={`http://localhost:5000${selectedReport.media_url}`} alt="Incident media" style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
                                        )}
                                    </div>
                                )}

                                <div className="incident-details">
                                    <div className="detail-item">
                                        <span className="label">Title:</span>
                                        <span className="value">{selectedReport.title}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Location:</span>
                                        <span className="value">{selectedReport.location}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Date:</span>
                                        <span className="value">{new Date(selectedReport.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'block' }}>
                                        <span className="label">Description:</span>
                                        <div style={{ color: '#1e293b', fontWeight: 500, marginTop: 6 }}>{selectedReport.description}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowActionModal(false)}>
                                Cancel
                            </button>
                            <button 
                                className={actionType === "investigating" ? "btn-warning" : "btn-success"}
                                onClick={handleAction}
                            >
                                {actionType === "investigating" ? "Start Investigation" : "Mark Resolved"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentReports;