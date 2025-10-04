import React, { useEffect, useState } from "react";
import api from "../lib/fetch";
import "../styles/DocumentRequests.css";
import "../styles/AccountMaintenance.css";

const pageSizeOptions = [10, 20, 50];

const AccountMaintenance = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewSrc, setPreviewSrc] = useState(null);

    // Utility: build absolute image URL from possible fields
    const API_BASE = process.env.REACT_APP_API_URL || window.__API_BASE__ || "http://localhost:5000";
    const toAbsoluteUrl = (value) => {
        if (!value || typeof value !== "string") return null;
        // If already absolute, normalize uploads to current API host if needed
        if (value.startsWith("http://") || value.startsWith("https://")) {
            try {
                const url = new URL(value);
                if (!url.pathname.startsWith("/uploads")) return value;
                const base = new URL(API_BASE);
                // Rewrite if host or protocol differ to avoid mixed content and stale hosts
                if (url.host !== base.host || url.protocol !== base.protocol) {
                    return `${API_BASE}${url.pathname}`;
                }
                return value;
            } catch {
                // fallthrough to relative handling
            }
        }
        const path = value.startsWith("/") ? value : `/${value}`;
        return `${API_BASE}${path}`;
    };
    const pickFirst = (obj, keys) => {
        for (const k of keys) {
            if (obj && obj[k]) return obj[k];
        }
        return null;
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/admin/users", {
                params: { page, limit, search, status: statusFilter || undefined }
            });
            setUsers(res.data?.data || []);
            setTotalPages(res.data?.pagination?.totalPages || 1);
        } catch (e) {
            console.error(e);
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit]);

    const onSearch = () => {
        setPage(1);
        fetchUsers();
    };

    const openUser = async (user) => {
        try {
            const res = await api.get(`/api/admin/users/${user.id}`);
            setSelectedUser(res.data?.data || user);
            setShowDetail(true);
        } catch (e) {
            setSelectedUser(user);
            setShowDetail(true);
        }
    };

    // View-only modal: no direct update of fields here

    const doAction = async (action) => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const res = await api.post(`/api/admin/users/${selectedUser.id}/action`, { action });
            const updated = res.data?.data;
            setSelectedUser(prev => ({ ...prev, ...updated }));
            setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        } catch (e) {
            alert("Action failed");
        } finally {
            setSaving(false);
        }
    };

    const statusBadge = (status) => {
        const cls = `status-badge ${status || 'pending'}`;
        const icon = status === 'active' ? 'check' : status === 'disabled' ? 'ban' : 'clock';
        const text = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
        return (
            <span className={cls}>
                <i className={`fas fa-${icon}`}></i>
                {text}
            </span>
        );
    };

    return (
        <div className="requests-container">
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-users-cog header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>Account Maintenance</h1>
                        <p>Review and manage registered users</p>
                    </div>
                </div>
            </div>

            <div className="tabs-container">
                <div className="tabs-header" style={{ alignItems: 'center' }}>
                    <div className="search-container" style={{ flex: 1 }}>
                        <div className="search-wrapper">
                            <i className="fas fa-search search-icon"></i>
                            <input
                                type="text"
                                placeholder="Search by name, email, clerk ID, or ID reference number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input"
                            />
                            {search && (
                                <button className="clear-search" onClick={() => setSearch("")}> 
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                        <button className="btn-success" onClick={onSearch}>
                            Apply
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="requests-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Date Registered</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center' }}>
                                        <div className="loading-spinner" style={{ margin: '12px auto' }}></div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>No users found</td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} onClick={() => openUser(u)} style={{ cursor: 'pointer' }}>
                                        <td>{u.name || '-'}</td>
                                        <td>{u.email || '-'}</td>
                                        <td>{u.contact || '-'}</td>
                                        <td>{statusBadge(u.status)}</td>
                                        <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                                        <td>
                                            <button className="action-btn view" onClick={(e) => { e.stopPropagation(); openUser(u); }}>
                                                <i className="fas fa-eye"></i>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#6b7280' }}>Rows per page:</span>
                        <select value={limit} onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}>
                            {pageSizeOptions.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                        <span style={{ color: '#374151' }}>Page {page} of {totalPages}</span>
                        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                    </div>
                </div>
            </div>

            {showDetail && selectedUser && (
                <div className="modal-overlay" onClick={() => { setShowDetail(false); setPreviewSrc(null); }}>
                    <div className="modal large-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>User Profile</h3>
                            <button className="close-btn" onClick={() => setShowDetail(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="request-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {/* Registration Info */}
                                <div style={{ display: 'grid', gap: 10 }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>User Registration Info</div>
                                    <div className="detail-item">
                                        <span className="label">Full Name:</span>
                                        <span className="value">{selectedUser.name || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Clerk ID:</span>
                                        <span className="value">{selectedUser.clerk_id || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Email:</span>
                                        <span className="value">{selectedUser.email || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Contact Number:</span>
                                        <span className="value">{selectedUser.contact || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Address:</span>
                                        <span className="value">{selectedUser.address || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Date of Birth:</span>
                                        <span className="value">{selectedUser.birth_date ? new Date(selectedUser.birth_date).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Status:</span>
                                        {statusBadge(selectedUser.status)}
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Reference #:</span>
                                        <span className="value">{selectedUser.reference_number || '-'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Date Registered:</span>
                                        <span className="value">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                                            <span style={{ fontWeight: 600 }}>Uploaded Selfie</span>
                                        </div>
                                        {toAbsoluteUrl(pickFirst(selectedUser, ['selfie_image_url','selfie_image','selfieImageUrl','selfieImagePath','selfieImage'])) ? (
                                            <img
                                                src={toAbsoluteUrl(pickFirst(selectedUser, ['selfie_image_url','selfie_image','selfieImageUrl','selfieImagePath','selfieImage']))}
                                                alt="Selfie"
                                                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', background: '#f8fafc', borderRadius: 8, cursor: 'pointer' }}
                                                onClick={() => setPreviewSrc(toAbsoluteUrl(pickFirst(selectedUser, ['selfie_image_url','selfie_image','selfieImageUrl','selfieImagePath','selfieImage'])))}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 13, color: '#6b7280' }}>No selfie image</div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                                            <span style={{ fontWeight: 600 }}>Valid ID</span>
                                        </div>
                                        {toAbsoluteUrl(pickFirst(selectedUser, ['id_image_url','id_image','idImageUrl','idImagePath','idImage'])) ? (
                                            <img
                                                src={toAbsoluteUrl(pickFirst(selectedUser, ['id_image_url','id_image','idImageUrl','idImagePath','idImage']))}
                                                alt="Valid ID"
                                                style={{ width: '100%', maxHeight: 180, objectFit: 'contain', background: '#f8fafc', borderRadius: 8, cursor: 'pointer' }}
                                                onClick={() => setPreviewSrc(toAbsoluteUrl(pickFirst(selectedUser, ['id_image_url','id_image','idImageUrl','idImagePath','idImage'])))}
                                            />
                                        ) : (
                                            <div style={{ fontSize: 13, color: '#6b7280' }}>No ID image</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {selectedUser.status === 'pending' && (
                                    <>
                                        <button className="btn-success" disabled={saving} onClick={() => doAction('approve')}>
                                            Approve
                                        </button>
                                        <button className="btn-danger" disabled={saving} onClick={() => doAction('reject')}>
                                            Reject
                                        </button>
                                    </>
                                )}
                                {selectedUser.status === 'active' && (
                                    <button className="btn-warning" disabled={saving} onClick={() => doAction('disable')}>
                                        Disable
                                    </button>
                                )}
                                {selectedUser.status === 'disabled' && (
                                    <button className="btn-success" disabled={saving} onClick={() => doAction('enable')}>
                                        Enable
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-secondary" onClick={() => setShowDetail(false)}>Close</button>
                            </div>
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
        </div>
    );
};

export default AccountMaintenance;


