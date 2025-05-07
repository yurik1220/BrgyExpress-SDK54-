import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/IdRequests.css";

const IdRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [activeTab, setActiveTab] = useState("pending");
    const [showModal, setShowModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionType, setActionType] = useState("");
    const [actionNote, setActionNote] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await axios.get("http://localhost:5000/api/requests");
            // Filter only ID requests from the response
            const idRequests = response.data.filter(item => item.type === 'Create ID');
            setRequests(idRequests);
            setLoading(false);
        } catch (err) {
            setError("Failed to fetch ID requests");
            setLoading(false);
        }
    };

    const handleAction = async (requestId, action) => {
        setActionType(action);
        setSelectedRequest(requests.find(req => req.id === requestId));
        setShowActionModal(true);
    };

    const submitAction = async () => {
        try {
            await axios.patch(`http://localhost:5000/api/id-requests/${selectedRequest.id}`, {
                status: actionType,
                rejection_reason: actionNote,
                appointment_date: actionType === 'approved' ? new Date().toISOString() : null
            });
            await fetchRequests();
            setShowActionModal(false);
            setActionNote("");
        } catch (err) {
            setError("Failed to update request status");
        }
    };

    const filteredRequests = requests.filter(request => {
        if (activeTab === "pending") {
            return request.status === "pending";
        } else if (activeTab === "history") {
            return request.status !== "pending";
        }
        return true;
    });

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading ID requests...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <i className="fas fa-exclamation-circle"></i>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="id-requests-container">
            <div className="content-header">
                <div className="header-content">
                    <i className="fas fa-id-card header-icon"></i>
                    <h1>ID Requests</h1>
                </div>
                <div className="header-stats">
                    <div className="stat-badge">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">
                            {requests.filter(req => req.status === "pending").length}
                        </span>
                    </div>
                    <div className="stat-badge">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{requests.length}</span>
                    </div>
                </div>
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
                        History
                    </button>
                </div>
                <div className="filter-container">
                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            <div className="requests-grid">
                {filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-inbox"></i>
                        <p>No ID requests found</p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <div
                            key={request.id}
                            className="request-card"
                            onClick={() => {
                                setSelectedRequest(request);
                                setShowModal(true);
                            }}
                        >
                            <div className="card-header">
                                <span className="request-type">ID Request</span>
                                <span className={`status-badge ${request.status}`}>
                                    {request.status}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-row">
                                    <i className="fas fa-user"></i>
                                    <span>{request.full_name}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-calendar"></i>
                                    <span>Birth Date: {new Date(request.birth_date).toLocaleDateString()}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>{request.address}</span>
                                </div>
                                <div className="info-row">
                                    <i className="fas fa-phone"></i>
                                    <span>{request.contact}</span>
                                </div>
                                <div className="timeline">
                                    <div className="timeline-item">
                                        <i className="fas fa-clock"></i>
                                        <span>Requested {new Date(request.created_at).toLocaleString()}</span>
                                    </div>
                                    {request.status !== "pending" && (
                                        <div className="timeline-item">
                                            <i className="fas fa-check-circle"></i>
                                            <span>Updated {new Date(request.resolved_at).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>ID Request Details</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-item">
                                <i className="fas fa-user"></i>
                                <div>
                                    <label>Full Name</label>
                                    <p>{selectedRequest.full_name}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-calendar"></i>
                                <div>
                                    <label>Birth Date</label>
                                    <p>{new Date(selectedRequest.birth_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-map-marker-alt"></i>
                                <div>
                                    <label>Address</label>
                                    <p>{selectedRequest.address}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-phone"></i>
                                <div>
                                    <label>Contact</label>
                                    <p>{selectedRequest.contact}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-clock"></i>
                                <div>
                                    <label>Request Date</label>
                                    <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            {selectedRequest.status !== "pending" && (
                                <div className="detail-item">
                                    <i className="fas fa-comment"></i>
                                    <div>
                                        <label>Action Note</label>
                                        <p>{selectedRequest.actionNote}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {selectedRequest.status === "pending" && (
                            <div className="modal-footer">
                                <button
                                    className="action-button approved"
                                    onClick={() => handleAction(selectedRequest.id, "approved")}
                                >
                                    <i className="fas fa-check"></i>
                                    Approve
                                </button>
                                <button
                                    className="action-button rejected"
                                    onClick={() => handleAction(selectedRequest.id, "rejected")}
                                >
                                    <i className="fas fa-times"></i>
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showActionModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {actionType === "approved" ? "Approve" : "Reject"} ID Request
                            </h2>
                            <button className="close-button" onClick={() => setShowActionModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-item">
                                <i className="fas fa-user"></i>
                                <div>
                                    <label>Applicant</label>
                                    <p>{selectedRequest.full_name}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-id-card"></i>
                                <div>
                                    <label>ID Type</label>
                                    <p>{selectedRequest.idType}</p>
                                </div>
                            </div>
                            <div className="detail-item">
                                <i className="fas fa-comment"></i>
                                <div>
                                    <label>Action Note</label>
                                    <textarea
                                        className="action-textarea"
                                        value={actionNote}
                                        onChange={(e) => setActionNote(e.target.value)}
                                        placeholder="Enter a note about this action..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-button"
                                onClick={() => setShowActionModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-button"
                                onClick={submitAction}
                            >
                                Confirm {actionType === "approved" ? "Approval" : "Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdRequests;