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
    const [searchRef, setSearchRef] = useState("");

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
    }).filter(request =>
        searchRef.trim() === "" ||
        (request.reference_number && request.reference_number.toLowerCase().includes(searchRef.trim().toLowerCase()))
    );

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
            {/* Enhanced Header */}
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-id-card header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>ID Requests</h1>
                        <p>Process and manage ID card requests from residents</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-badge pending">
                        <div className="stat-icon">
                            <i className="fas fa-clock"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.filter(req => req.status === "pending").length}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-badge approved">
                        <div className="stat-icon">
                            <i className="fas fa-check-circle"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.filter(req => req.status === "approved").length}</span>
                            <span className="stat-label">Approved</span>
                        </div>
                    </div>
                    <div className="stat-badge total">
                        <div className="stat-icon">
                            <i className="fas fa-id-card"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{requests.length}</span>
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
                            <span>Pending Requests</span>
                            <span className="tab-count">{requests.filter(req => req.status === "pending").length}</span>
                        </button>
                        <button
                            className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                            onClick={() => setActiveTab("history")}
                        >
                            <i className="fas fa-history"></i>
                            <span>History</span>
                            <span className="tab-count">{requests.filter(req => req.status !== "pending").length}</span>
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
                {activeTab === "history" && (
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
                )}
            </div>

            {/* Enhanced Requests Grid */}
            <div className="requests-grid">
                {filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <i className="fas fa-id-card"></i>
                        </div>
                        <h3>No ID Requests Found</h3>
                        <p>No {activeTab} ID requests available.</p>
                    </div>
                ) : (
                    filteredRequests.map(request => (
                        <div
                            key={request.id}
                            className={`request-card ${request.status}-card`}
                            onClick={() => {
                                setSelectedRequest(request);
                                setShowModal(true);
                            }}
                        >
                            <div className="card-header">
                                <div className="request-info">
                                    <span className="request-type">
                                        <i className="fas fa-id-card"></i>
                                        ID Request
                                    </span>
                                    <span className="reference-number">
                                        #{request.reference_number}
                                    </span>
                                </div>
                                <span className={`status-badge ${request.status}`}>
                                    <i className={`fas fa-${request.status === 'approved' ? 'check' : request.status === 'rejected' ? 'times' : 'clock'}`}></i>
                                    {request.status}
                                </span>
                            </div>
                            <div className="card-body">
                                <div className="info-section">
                                    <div className="info-row">
                                        <i className="fas fa-user"></i>
                                        <span className="label">Name:</span>
                                        <span className="value">{request.full_name}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-calendar"></i>
                                        <span className="label">Birth Date:</span>
                                        <span className="value">{new Date(request.birth_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-map-marker-alt"></i>
                                        <span className="label">Address:</span>
                                        <span className="value">{request.address}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-phone"></i>
                                        <span className="label">Contact:</span>
                                        <span className="value">{request.contact}</span>
                                    </div>
                                    <div className="info-row">
                                        <i className="fas fa-clock"></i>
                                        <span className="label">Requested:</span>
                                        <span className="value">{new Date(request.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {request.status === "pending" && (
                                    <div className="card-actions">
                                        <button 
                                            className="action-btn approve"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(request.id, "approved");
                                            }}
                                        >
                                            <i className="fas fa-check"></i>
                                            Approve
                                        </button>
                                        <button 
                                            className="action-btn reject"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(request.id, "rejected");
                                            }}
                                        >
                                            <i className="fas fa-times"></i>
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Enhanced Detail Modal */}
            {showModal && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>ID Request Details</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="request-details">
                                <div className="detail-item">
                                    <span className="label">Reference Number:</span>
                                    <span className="value">#{selectedRequest.reference_number}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Full Name:</span>
                                    <span className="value">{selectedRequest.full_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Birth Date:</span>
                                    <span className="value">{new Date(selectedRequest.birth_date).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Address:</span>
                                    <span className="value">{selectedRequest.address}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Contact Number:</span>
                                    <span className="value">{selectedRequest.contact}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Request Date:</span>
                                    <span className="value">{new Date(selectedRequest.created_at).toLocaleString()}</span>
                                </div>
                                {selectedRequest.status !== "pending" && (
                                    <div className="detail-item">
                                        <span className="label">Processed Date:</span>
                                        <span className="value">{new Date(selectedRequest.resolved_at).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedRequest.rejection_reason && (
                                    <div className="detail-item">
                                        <span className="label">Rejection Reason:</span>
                                        <span className="value">{selectedRequest.rejection_reason}</span>
                                    </div>
                                )}
                                {selectedRequest.appointment_date && (
                                    <div className="detail-item">
                                        <span className="label">Appointment Date:</span>
                                        <span className="value">{new Date(selectedRequest.appointment_date).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Action Modal */}
            {showActionModal && selectedRequest && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {actionType === "approved" ? "Approve ID Request" : "Reject ID Request"}
                            </h3>
                            <button className="close-btn" onClick={() => setShowActionModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                {actionType === "approved" 
                                    ? "Are you sure you want to approve this ID request?" 
                                    : "Please provide a reason for rejecting this ID request:"
                                }
                            </p>
                            {actionType === "rejected" && (
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    placeholder="Enter rejection reason..."
                                    className="rejection-textarea"
                                />
                            )}
                            <div className="request-summary">
                                <div className="summary-item">
                                    <span className="label">Name:</span>
                                    <span className="value">{selectedRequest.full_name}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="label">Contact:</span>
                                    <span className="value">{selectedRequest.contact}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowActionModal(false)}>
                                Cancel
                            </button>
                            <button 
                                className={actionType === "approved" ? "btn-success" : "btn-danger"}
                                onClick={submitAction}
                                disabled={actionType === "rejected" && !actionNote.trim()}
                            >
                                {actionType === "approved" ? "Approve Request" : "Reject Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IdRequests;