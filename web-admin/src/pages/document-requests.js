import React, { useState, useEffect } from "react";
import axios from "axios";
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
                const response = await axios.get("http://localhost:5000/api/requests");
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

            const response = await axios.patch(
                `http://localhost:5000/api/document-requests/${selectedRequest.id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
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

            const response = await axios.patch(
                `http://localhost:5000/api/document-requests/${selectedRequest.id}`,
                payload,
                { headers: { 'Content-Type': 'application/json' } }
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
            <div className="content-header">
                <div className="header-content">
                    <i className="fas fa-file-alt header-icon"></i>
                    <h1>Document Requests</h1>
                </div>
                <div className="header-stats">
                    <div className="stat-badge">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">{pendingRequests.length}</span>
                    </div>
                    <div className="stat-badge">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{pendingRequests.length + history.length}</span>
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
                        Pending Requests
                    </button>
                    <button
                        className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        <i className="fas fa-history"></i>
                        History Log
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

            <div className="requests-grid">
                {activeTab === "pending" ? (
                    filteredPending.length > 0 ? (
                        filteredPending.map((request) => (
                            <div
                                key={request.id}
                                className="request-card"
                                onClick={() => setSelectedRequest(request)}
                            >
                                <div className="card-header">
                                    <span className="document-type">{request.document_type}</span>
                                    <span className="status-badge pending">Pending</span>
                                </div>
                                <div className="card-body">
                                    <div className="info-row">
                                        <i className="fas fa-user"></i>
                                        <span>Clerk ID: {request.clerk_id}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-comment"></i>
                                        <span>{request.reason}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-clock"></i>
                                        <span>{new Date(request.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <i className="fas fa-inbox"></i>
                            <p>No pending document requests</p>
                        </div>
                    )
                ) : (
                    filteredHistory.length > 0 ? (
                        filteredHistory.map((request) => (
                            <div
                                key={request.id}
                                className={`request-card ${request.status.toLowerCase()}`}
                                onClick={() => setSelectedRequest(request)}
                            >
                                <div className="card-header">
                                    <span className="document-type">{request.document_type}</span>
                                    <span className={`status-badge ${request.status.toLowerCase()}`}>
                                        {request.status}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <div className="info-row">
                                        <i className="fas fa-user"></i>
                                        <span>Clerk ID: {request.clerk_id}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-comment"></i>
                                        <span>{request.reason}</span>
                                    </div>
                                    {request.status.toLowerCase() === 'approved' && request.appointment_date && (
                                        <div className="info-row">
                                            <i className="fas fa-calendar-check"></i>
                                            <span>Pickup: {new Date(request.appointment_date).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {request.status.toLowerCase() === 'rejected' && request.rejection_reason && (
                                        <div className="info-row">
                                            <i className="fas fa-times-circle"></i>
                                            <span>Reason: {request.rejection_reason}</span>
                                        </div>
                                    )}
                                    <div className="timeline">
                                        <div className="timeline-item">
                                            <i className="fas fa-paper-plane"></i>
                                            <span>Submitted: {new Date(request.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="timeline-item">
                                            <i className="fas fa-check-circle"></i>
                                            <span>Resolved: {new Date(request.resolved_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <i className="fas fa-history"></i>
                            <p>No {historyFilter === "all" ? "" : historyFilter} requests in history</p>
                        </div>
                    )
                )}
            </div>

            {selectedRequest && !showRejectForm && !showAppointmentModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Request Details</h2>
                            <button className="close-button" onClick={() => setSelectedRequest(null)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedRequest.reference_number && (
                                <div className="detail-item">
                                    <i className="fas fa-hashtag"></i>
                                    <div>
                                        <label>Reference Number</label>
                                        <p>{selectedRequest.reference_number}</p>
                                    </div>
                                </div>
                            )}
                            <div className="detail-item">
                                <i className="fas fa-file-alt"></i>
                                <div>
                                    <label>Document Type</label>
                                    <p>{selectedRequest.document_type}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-user"></i>
                                <div>
                                    <label>Clerk ID</label>
                                    <p>{selectedRequest.clerk_id}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-comment"></i>
                                <div>
                                    <label>Reason</label>
                                    <p>{selectedRequest.reason}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-clock"></i>
                                <div>
                                    <label>Date Submitted</label>
                                    <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        {(!selectedRequest.status || selectedRequest.status === 'pending') && (
                            <div className="modal-footer">
                                <button className="approve-button" onClick={() => setShowAppointmentModal(true)}>
                                    <i className="fas fa-check"></i>
                                    Approve
                                </button>
                                <button className="reject-button" onClick={() => setShowRejectForm(true)}>
                                    <i className="fas fa-times"></i>
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showRejectForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Reason for Rejection</h2>
                            <button className="close-button" onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                className="rejection-textarea"
                                placeholder="Enter rejection reason..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows="5"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="confirm-reject-button" onClick={confirmRejection}>
                                <i className="fas fa-check"></i>
                                Confirm Rejection
                            </button>
                            <button className="cancel-button" onClick={() => { setShowRejectForm(false); setRejectionReason(""); }}>
                                <i className="fas fa-times"></i>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAppointmentModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Schedule Pickup</h2>
                            <button className="close-button" onClick={() => { setShowAppointmentModal(false); setAppointmentDate(""); setAppointmentTime(""); }}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="appointment-form">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={appointmentDate}
                                        onChange={(e) => setAppointmentDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input
                                        type="time"
                                        value={appointmentTime}
                                        onChange={(e) => setAppointmentTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="confirm-button" onClick={handleApproveWithAppointment}>
                                <i className="fas fa-check"></i>
                                Schedule & Approve
                            </button>
                            <button className="cancel-button" onClick={() => { setShowAppointmentModal(false); setAppointmentDate(""); setAppointmentTime(""); }}>
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

export default DocumentRequests;