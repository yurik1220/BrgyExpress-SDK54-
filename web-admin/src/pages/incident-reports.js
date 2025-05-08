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
            <div className="content-header">
                <div className="header-content">
                    <i className="fas fa-exclamation-triangle header-icon"></i>
                    <h1>Incident Reports</h1>
                </div>
                <div className="header-stats">
                    <div className="stat-badge">
                        <span className="stat-label">Active</span>
                        <span className="stat-value">
                            {activeIncidents.length}
                        </span>
                    </div>
                    <div className="stat-badge">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">
                            {pendingIncidents.length + activeIncidents.length + closedIncidents.length}
                        </span>
                    </div>
                </div>
            </div>
            <div style={{ margin: '16px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <input
                    type="text"
                    placeholder="Search by Reference Number..."
                    value={searchRef}
                    onChange={e => setSearchRef(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', width: 260 }}
                />
            </div>

            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
                        onClick={() => setActiveTab("pending")}
                    >
                        <i className="fas fa-clock"></i>
                        Pending Reports
                    </button>
                    <button
                        className={`tab-button ${activeTab === "active" ? "active" : ""}`}
                        onClick={() => setActiveTab("active")}
                    >
                        <i className="fas fa-search"></i>
                        Active Reports
                    </button>
                    <button
                        className={`tab-button ${activeTab === "closed" ? "active" : ""}`}
                        onClick={() => setActiveTab("closed")}
                    >
                        <i className="fas fa-check-circle"></i>
                        Closed Reports
                    </button>
                </div>
            </div>

            <div className="reports-grid">
                {getCurrentIncidents().length > 0 ? (
                    getCurrentIncidents().map((report) => (
                        <div
                            key={report.id}
                            className="report-card"
                            onClick={() => setSelectedReport(report)}
                        >
                            <div className="card-header">
                                <span className="incident-type">{report.title}</span>
                                <span className={`status-badge ${report.status || 'pending'}`}>
                                    {report.status || 'Pending'}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-row">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>{report.location}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-user"></i>
                                    <span>Reported by: {report.clerk_id}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-comment"></i>
                                    <span>{report.description}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-clock"></i>
                                    <span>{new Date(report.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <i className="fas fa-clipboard-list"></i>
                        <p>No {activeTab} incident reports</p>
                    </div>
                )}
            </div>

            {selectedReport && !showActionModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Incident Details</h2>
                            <button className="close-button" onClick={() => setSelectedReport(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedReport.reference_number && (
                                <div className="detail-item">
                                    <i className="fas fa-hashtag"></i>
                                    <div>
                                        <label>Reference Number</label>
                                        <p>{selectedReport.reference_number}</p>
                                    </div>
                                </div>
                            )}
                            <div className="detail-item">
                                <i className="fas fa-exclamation-triangle"></i>
                                <div>
                                    <label>Title</label>
                                    <p>{selectedReport.title}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-map-marker-alt"></i>
                                <div>
                                    <label>Location</label>
                                    <p>{selectedReport.location}</p>
                                    {mapUrl && (
                                        <button 
                                            className="map-button"
                                            onClick={() => window.open(mapUrl, '_blank')}
                                        >
                                            <i className="fas fa-map"></i>
                                            View on Google Maps
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-user"></i>
                                <div>
                                    <label>Reporter ID</label>
                                    <p>{selectedReport.clerk_id}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-comment"></i>
                                <div>
                                    <label>Description</label>
                                    <p>{selectedReport.description}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-clock"></i>
                                <div>
                                    <label>Reported At</label>
                                    <p>{new Date(selectedReport.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            {selectedReport.media_url && (
                                <div className="detail-item">
                                    <i className="fas fa-image"></i>
                                    <div>
                                        <label>Media Evidence</label>
                                        <div className="media-container">
                                            <img 
                                                src={`http://localhost:5000${selectedReport.media_url}`} 
                                                alt="Incident Media" 
                                                className="incident-media"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {(!selectedReport.status || selectedReport.status === "pending") && (
                            <div className="modal-footer">
                                <button 
                                    className="action-button investigating"
                                    onClick={() => {
                                        setActionType("investigating");
                                        setShowActionModal(true);
                                    }}
                                >
                                    <i className="fas fa-check"></i>
                                    Accept Incident
                                </button>
                            </div>
                        )}
                        {selectedReport.status === "in_progress" && (
                            <div className="modal-footer">
                                <button 
                                    className="action-button closed"
                                    onClick={() => {
                                        setActionType("closed");
                                        setShowActionModal(true);
                                    }}
                                >
                                    <i className="fas fa-times"></i>
                                    Close Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showActionModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Confirm Action</h2>
                            <button 
                                className="close-button" 
                                onClick={() => {
                                    setShowActionModal(false);
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to {actionType === "investigating" ? "accept" : "close"} this incident report?</p>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="confirm-button"
                                onClick={handleAction}
                            >
                                <i className="fas fa-check"></i>
                                Confirm
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={() => {
                                    setShowActionModal(false);
                                }}
                            >
                                <i className="fas fa-times"></i>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentReports;