// Incident Reports admin page
// Responsibilities:
// - Fetch all request records then filter Incident Reports only
// - Split into tabs by status: pending, in_progress, closed
// - Show details, allow status transitions, and quick map view
// Data Flow:
//   GET /api/requests → filter type === 'Incident Report'
//   PATCH /api/incidents/:id with status ∈ { in_progress, closed }
import React, { useState, useEffect } from "react";
import api from "../lib/fetch";
import "../styles/IncidentReports.css";

const IncidentReports = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showActionModal, setShowActionModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [actionType, setActionType] = useState("");
    const [pendingIncidents, setPendingIncidents] = useState([]);
    const [activeIncidents, setActiveIncidents] = useState([]);
    const [closedIncidents, setClosedIncidents] = useState([]);
    const [mapUrl, setMapUrl] = useState("");
    const [previewSrc, setPreviewSrc] = useState(null);
    const [searchRef, setSearchRef] = useState("");

    // Normalize relative vs absolute media URLs
    const API_BASE = process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000';
    const toAbsoluteUrl = (value) => {
        if (!value || typeof value !== 'string') return null;
        const v = value.trim();
        if (v.startsWith('http://') || v.startsWith('https://')) return v;
        const path = v.startsWith('/') ? v : `/${v}`;
        return `${API_BASE}${path}`;
    };

    // Fetch and categorize incident reports on first render
    useEffect(() => {
        const fetchReports = async () => {
            try {
                // Use shared API instance so auth headers are attached and base URL is configurable
                const response = await api.get("/api/requests");
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

    // Maintain a Google Maps link for the selected report
    useEffect(() => {
        if (selectedReport?.location) {
            const [longitude, latitude] = selectedReport.location.split(",").map(Number);
            setMapUrl(`https://www.google.com/maps?q=${latitude},${longitude}`);
        }
    }, [selectedReport]);

    // Triggered by modal actions to advance status
    const handleAction = async () => {
        try {
            const payload = {
                status: actionType === "investigating" ? "in_progress" : "closed",
                resolved_at: new Date().toISOString()
            };

            const response = await api.patch(
                `/api/incidents/${selectedReport.id}`,
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

    // Helper: derive visible list based on active tab and optional search filter
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
                            onClick={() => { setSelectedReport(report); setShowDetailsModal(true); }}
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
                                    {/* Location/Reporter/Contact moved to details modal */}
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
                                {/* Actions moved into details modal */}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedReport && (
                <div className="modal-overlay">
                    <div className="modal wide-modal">
                        <div className="modal-header">
                            <h3>Incident Report Details</h3>
                            <button className="close-btn" onClick={() => setShowDetailsModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
                              {/* Left: Details + media */}
                              <div>
                                {selectedReport?.media_url && (
                                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 12 }}>
                                        {/\.(mp4|webm|ogg)$/i.test(selectedReport.media_url) ? (
                                            <video controls style={{ width: '100%', maxHeight: 360 }}>
                                                <source src={toAbsoluteUrl(selectedReport.media_url)} />
                                                Your browser does not support the video tag.
                                            </video>
                                        ) : (
                                            <img src={toAbsoluteUrl(selectedReport.media_url)} alt="Incident media" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', background: '#f8fafc', cursor: 'pointer' }} onClick={() => setPreviewSrc(toAbsoluteUrl(selectedReport.media_url))} />
                                        )}
                                    </div>
                                )}
                                <div className="incident-details">
                                    <div className="detail-item"><span className="label">Reference Number:</span><span className="value">#{selectedReport.reference_number}</span></div>
                                    <div className="detail-item"><span className="label">Title:</span><span className="value">{selectedReport.title}</span></div>
                                    <div className="detail-item"><span className="label">Location:</span><span className="value">{selectedReport.location}</span></div>
                                    <div className="detail-item"><span className="label">Reported:</span><span className="value">{new Date(selectedReport.created_at).toLocaleString()}</span></div>
                                    <div className="detail-item" style={{ display: 'block' }}>
                                        <span className="label">Description:</span>
                                        <div style={{ color: '#1e293b', fontWeight: 500, marginTop: 6 }}>{selectedReport.description}</div>
                                    </div>
                                </div>
                              </div>
                              {/* Right: Reporter profile snapshot */}
                              <div className="incident-details" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                                <div className="detail-item"><span className="label">Reporter:</span><span className="value">{selectedReport.requester_name || selectedReport.clerk_id}</span></div>
                                <div className="detail-item"><span className="label">Contact:</span><span className="value">{selectedReport.requester_phone || '-'}</span></div>
                                <div className="detail-item"><span className="label">Clerk ID:</span><span className="value">{selectedReport.clerk_id}</span></div>
                                {(() => {
                                  const API_BASE = process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000';
                                  const toAbsoluteUrl = (value) => {
                                    if (!value || typeof value !== 'string') return null;
                                    const v = value.trim();
                                    if (v.startsWith('http://') || v.startsWith('https://')) return v;
                                    const path = v.startsWith('/') ? v : `/${v}`;
                                    return `${API_BASE}${path}`;
                                  };
                                  const src = toAbsoluteUrl(selectedReport.requester_selfie || selectedReport.selfie_image_url);
                                  return src ? (
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>Selfie</div>
                                      <img src={src} alt="Reporter Selfie" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', cursor: 'pointer' }} onClick={() => setPreviewSrc(src)} />
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            {selectedReport.status === 'pending' && (
                                <button className="btn-warning" onClick={() => { setShowDetailsModal(false); setActionType('investigating'); setShowActionModal(true); }}>
                                    <i className="fas fa-search"></i>
                                    Start Investigation
                                </button>
                            )}
                            {selectedReport.status === 'in_progress' && (
                                <button className="btn-success" onClick={() => { setShowDetailsModal(false); setActionType('resolved'); setShowActionModal(true); }}>
                                    <i className="fas fa-check"></i>
                                    Close Investigation
                                </button>
                            )}
                            {selectedReport.location && (
                                <button className="btn-primary" onClick={() => {
                                    const [longitude, latitude] = selectedReport.location.split(',').map(Number);
                                    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
                                }}>
                                    <i className="fas fa-map"></i>
                                    View Map
                                </button>
                            )}
                            <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {previewSrc && (
                <div className="modal-overlay" onClick={() => setPreviewSrc(null)}>
                    <div className="modal" style={{ maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Image Preview</h3>
                            <button className="close-btn" onClick={() => setPreviewSrc(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <img src={previewSrc} alt="Preview" style={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 8 }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Action Modal */}
            {showActionModal && selectedReport && (
                <div className="modal-overlay">
                    <div className="modal square-modal">
                        <div className="modal-header">
                            <h3>
                                {actionType === "investigating" ? "Start Investigation" : actionType === "resolved" ? "Close Investigation" : "Mark as Resolved"}
                            </h3>
                            <button className="close-btn" onClick={() => setShowActionModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center', padding: '8px' }}>
                                <div style={{ 
                                    width: 60, 
                                    height: 60, 
                                    borderRadius: '50%', 
                                    backgroundColor: actionType === 'investigating' ? '#fef3c7' : '#d1fae5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 12px',
                                    fontSize: '22px',
                                    color: actionType === 'investigating' ? '#f59e0b' : '#10b981'
                                }}>
                                    <i className={`fas fa-${actionType === 'investigating' ? 'search' : 'check'}`}></i>
                                </div>
                                <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: '14px', lineHeight: '1.4' }}>
                                    {actionType === 'investigating' 
                                        ? 'Start investigating this incident?' 
                                        : 'Close this investigation?'
                                    }
                                </p>
                                
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowActionModal(false)}>
                                Cancel
                            </button>
                            <button 
                                className={actionType === "investigating" ? "btn-warning" : actionType === "resolved" ? "btn-success" : "btn-success"}
                                onClick={handleAction}
                            >
                                {actionType === "investigating" ? "Start Investigation" : actionType === "resolved" ? "Close Investigation" : "Mark Resolved"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentReports;