import React, { useState, useEffect } from "react";
import api from "../lib/fetch";
import "../styles/DocumentRequests.css";

const DocumentRequests = () => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [historyFilter, setHistoryFilter] = useState("all");
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [searchRef, setSearchRef] = useState("");

    useEffect(() => {
        const fetchDocumentRequests = async () => {
            try {
                const response = await api.get("/api/requests");
                const allRequests = response.data.filter(req => req.type === "Document Request");
                const pending = allRequests.filter(req => !req.status || req.status === 'pending');
                const resolved = allRequests.filter(req => req.status && req.status !== 'pending');
                setPendingRequests(pending);
                setHistory(resolved);
            } catch (error) {
                setError("Error fetching document requests");
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDocumentRequests();
    }, []);

    const handleApproveWithAppointment = async () => {
        if (!appointmentDate || !appointmentTime) {
            alert("Please select both date and time for the appointment");
            return;
        }

        const appointmentDateTime = `${appointmentDate}T${appointmentTime}:00.000Z`;

        try {
            const payload = {
                status: 'approved',
                resolved_at: new Date().toISOString(),
                appointment_date: appointmentDateTime
            };

            const response = await api.patch(
                `/api/document-requests/${selectedRequest.id}`,
                payload
            );

            if (response.data && response.data.id) {
                setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
                setHistory(prev => [response.data, ...prev]);
                setSelectedRequest(null);
                setShowAppointmentModal(false);
                setAppointmentDate("");
                setAppointmentTime("");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to schedule appointment. Please try again.");
        }
    };

    const handleDecision = async (status) => {
        if (!selectedRequest) return;

        try {
            const normalizedStatus = status.toLowerCase();
            const payload = {
                status: normalizedStatus,
                resolved_at: new Date().toISOString()
            };

            if (normalizedStatus === 'rejected') {
                payload.rejection_reason = rejectionReason;
            }

            const response = await api.patch(
                `/api/document-requests/${selectedRequest.id}`,
                payload
            );

            if (response.data && response.data.id) {
                setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
                setHistory(prev => [response.data, ...prev]);
                setSelectedRequest(null);
                setShowRejectForm(false);
                setRejectionReason("");
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Failed to update request status");
        }
    };

    const confirmRejection = () => {
        if (!rejectionReason.trim()) {
            alert("Please enter a reason for rejection.");
            return;
        }
        handleDecision("Rejected");
    };

    const filteredPending = pendingRequests.filter(request =>
        searchRef.trim() === "" ||
        (request.reference_number && request.reference_number.toLowerCase().includes(searchRef.trim().toLowerCase()))
    );
    const filteredHistory = history.filter(request => {
        if (historyFilter === "all") return true;
        return request.status.toLowerCase() === historyFilter.toLowerCase();
    }).filter(request =>
        searchRef.trim() === "" ||
        (request.reference_number && request.reference_number.toLowerCase().includes(searchRef.trim().toLowerCase()))
    );

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading document requests...</p>
        </div>
    );
    
    if (error) return (
        <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="document-requests-container">
            {/* Enhanced Header */}
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-file-alt header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>Document Requests</h1>
                        <p>Manage and process document requests from residents</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-badge pending">
                        <div className="stat-icon">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{pendingRequests.length}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-badge total">
                        <div className="stat-icon">
                            <i className="fas fa-file-alt"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{pendingRequests.length + history.length}</span>
                            <span className="stat-label">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Search Bar */}
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

            {/* Enhanced Tabs */}
            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
                        onClick={() => setActiveTab("pending")}
                    >
                        <i className="fas fa-clock"></i>
                        <span>Pending Requests</span>
                        <span className="tab-count">{pendingRequests.length}</span>
                    </button>
                    <button
                        className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        <i className="fas fa-history"></i>
                        <span>History Log</span>
                        <span className="tab-count">{history.length}</span>
                    </button>
                </div>

                {activeTab === "history" && (
                    <div className="filter-container">
                        <select
                            className="filter-select"
                            value={historyFilter}
                            onChange={(e) => setHistoryFilter(e.target.value)}
                        >
                            <option value="all">All Requests</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Enhanced Requests Grid */}
            <div className="requests-grid">
                {activeTab === "pending" && (
                    filteredPending.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <h3>No Pending Requests</h3>
                            <p>All document requests have been processed!</p>
                        </div>
                    ) : (
                        filteredPending.map((request) => (
                            <div
                                key={request.id}
                                className="request-card pending-card"
                                onClick={() => setSelectedRequest(request)}
                            >
                                <div className="card-header">
                                    <div className="request-info">
                                        <span className="request-type">
                                            <i className="fas fa-file-alt"></i>
                                            Document Request
                                        </span>
                                        <span className="reference-number">
                                            #{request.reference_number}
                                        </span>
                                    </div>
                                    <span className="status-badge pending">
                                        <i className="fas fa-clock"></i>
                                        Pending
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="info-section">
                                        <div className="info-row">
                                            <i className="fas fa-user"></i>
                                            <span className="label">Requester:</span>
                                            <span className="value">{request.full_name}</span>
                                        </div>
                                        <div className="info-row">
                                            <i className="fas fa-calendar"></i>
                                            <span className="label">Requested:</span>
                                            <span className="value">{new Date(request.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="info-row">
                                            <i className="fas fa-file"></i>
                                            <span className="label">Document:</span>
                                            <span className="value">{request.document_type}</span>
                                        </div>
                                        <div className="info-row">
                                            <i className="fas fa-phone"></i>
                                            <span className="label">Contact:</span>
                                            <span className="value">{request.contact}</span>
                                        </div>
                                    </div>
                                    <div className="card-actions">
                                        <button 
                                            className="action-btn approve"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRequest(request);
                                                setShowAppointmentModal(true);
                                            }}
                                        >
                                            <i className="fas fa-check"></i>
                                            Approve
                                        </button>
                                        <button 
                                            className="action-btn reject"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRequest(request);
                                                setShowRejectForm(true);
                                            }}
                                        >
                                            <i className="fas fa-times"></i>
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}

                {activeTab === "history" && (
                    filteredHistory.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <i className="fas fa-history"></i>
                            </div>
                            <h3>No History</h3>
                            <p>No processed requests found.</p>
                        </div>
                    ) : (
                        filteredHistory.map((request) => (
                            <div
                                key={request.id}
                                className={`request-card history-card ${request.status}`}
                                onClick={() => setSelectedRequest(request)}
                            >
                                <div className="card-header">
                                    <div className="request-info">
                                        <span className="request-type">
                                            <i className="fas fa-file-alt"></i>
                                            Document Request
                                        </span>
                                        <span className="reference-number">
                                            #{request.reference_number}
                                        </span>
                                    </div>
                                    <span className={`status-badge ${request.status}`}>
                                        <i className={`fas fa-${request.status === 'approved' ? 'check' : 'times'}`}></i>
                                        {request.status}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="info-section">
                                        <div className="info-row">
                                            <i className="fas fa-user"></i>
                                            <span className="label">Requester:</span>
                                            <span className="value">{request.full_name}</span>
                                        </div>
                                        <div className="info-row">
                                            <i className="fas fa-calendar"></i>
                                            <span className="label">Processed:</span>
                                            <span className="value">{new Date(request.resolved_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="info-row">
                                            <i className="fas fa-file"></i>
                                            <span className="label">Document:</span>
                                            <span className="value">{request.document_type}</span>
                                        </div>
                                        {request.appointment_date && (
                                            <div className="info-row">
                                                <i className="fas fa-calendar-check"></i>
                                                <span className="label">Appointment:</span>
                                                <span className="value">{new Date(request.appointment_date).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {request.rejection_reason && (
                                            <div className="info-row">
                                                <i className="fas fa-comment"></i>
                                                <span className="label">Reason:</span>
                                                <span className="value">{request.rejection_reason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Enhanced Modals */}
            {showRejectForm && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Reject Request</h3>
                            <button className="close-btn" onClick={() => setShowRejectForm(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Please provide a reason for rejecting this request:</p>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="rejection-textarea"
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowRejectForm(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={confirmRejection}>
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAppointmentModal && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Schedule Appointment</h3>
                            <button className="close-btn" onClick={() => setShowAppointmentModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Appointment Date:</label>
                                <input
                                    type="date"
                                    value={appointmentDate}
                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Appointment Time:</label>
                                <input
                                    type="time"
                                    value={appointmentTime}
                                    onChange={(e) => setAppointmentTime(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowAppointmentModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-success" onClick={handleApproveWithAppointment}>
                                Approve & Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentRequests;