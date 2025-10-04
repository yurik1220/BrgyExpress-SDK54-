import React, { useState, useEffect } from "react";
import api from "../lib/fetch";
import ConfirmationModal from "../components/ConfirmationModal";
import "../styles/AnnouncementPage.css";

const AnnouncementPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        priority: "normal",
        media: null,
        expires_in_days: "7"
    });

    // Modal states
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
    const [infoState, setInfoState] = useState({ isOpen: false, title: "", message: "", confirmText: "OK" });

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await api.get("/api/announcements");
                setAnnouncements(response.data);
            } catch (err) {
                setError("Failed to load announcements");
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, media: file }));
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => setMediaPreview(reader.result);
                reader.readAsDataURL(file);
            } else {
                setMediaPreview(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            setInfoState({ isOpen: true, title: "Missing required fields", message: "Please fill in both Title and Content.", confirmText: "OK" });
            return;
        }

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('content', formData.content);
            formDataToSend.append('priority', formData.priority);
            if (formData.expires_in_days) {
                formDataToSend.append('expires_in_days', formData.expires_in_days);
            }

            if (formData.media) {
                formDataToSend.append('media', formData.media);
            }

            // Do not set Content-Type manually; let Axios/browser set proper multipart boundaries
            await api.post("/api/announcements", formDataToSend);

            const response = await api.get("/api/announcements");
            setAnnouncements(response.data);
            setFormData({ title: "", content: "", priority: "normal", media: null, expires_in_days: "7" });
            setMediaPreview(null);
            setShowForm(false);
            setInfoState({ isOpen: true, title: "Success", message: "Announcement posted successfully.", confirmText: "Great" });
        } catch (err) {
            console.error('Error posting announcement:', err);
            const message = err?.response?.data?.error || "Failed to post announcement";
            setInfoState({ isOpen: true, title: "Error", message, confirmText: "Close" });
        }
    };

    const performDelete = async (id) => {
        try {
            await api.delete(`/api/announcements/${id}`, {
                headers: {
                    'x-clerk-id': localStorage.getItem('clerk_id')
                }
            });
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            const message = err?.response?.data?.error || "Failed to delete announcement";
            setInfoState({ isOpen: true, title: "Error", message, confirmText: "Close" });
        }
    };

    const handleDelete = (id) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Announcement",
            message: "Are you sure you want to delete this announcement? This action cannot be undone.",
            onConfirm: () => performDelete(id)
        });
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading announcements...</p>
        </div>
    );
    
    if (error) return (
        <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="announcement-page-container">
            {/* Enhanced Header */}
            <div className="content-header">
                <div className="header-content">
                    <div className="header-icon-wrapper">
                        <i className="fas fa-bullhorn header-icon"></i>
                    </div>
                    <div className="header-text">
                        <h1>Announcements</h1>
                        <p>Create and manage community announcements</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-badge total">
                        <div className="stat-icon">
                            <i className="fas fa-bullhorn"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{announcements.length}</span>
                            <span className="stat-label">Total</span>
                        </div>
                    </div>
                    <div className="stat-badge urgent">
                        <div className="stat-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{announcements.filter(a => a.priority === 'urgent').length}</span>
                            <span className="stat-label">Urgent</span>
                        </div>
                    </div>
                    <button className="create-announcement-btn" onClick={() => setShowForm(true)}>
                        <i className="fas fa-plus"></i>
                        <span>New Announcement</span>
                    </button>
                </div>
            </div>

            {/* Enhanced Announcements List */}
            <div className="announcements-list">
                {announcements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <i className="fas fa-bullhorn"></i>
                        </div>
                        <h3>No Announcements Yet</h3>
                        <p>Click "New Announcement" to get started!</p>
                        <button className="create-first-btn" onClick={() => setShowForm(true)}>
                            <i className="fas fa-plus"></i>
                            Create First Announcement
                        </button>
                    </div>
                ) : (
                    announcements.map(announcement => (
                        <div key={announcement.id} className={`announcement-card ${announcement.priority}`}>
                            <div className="card-header">
                                <div className="announcement-info">
                                    <h3 className="announcement-title">{announcement.title}</h3>
                                    <div className="announcement-meta">
                                        <span className="announcement-date">
                                            <i className="fas fa-calendar-alt"></i>
                                            {new Date(announcement.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="announcement-time">
                                            <i className="fas fa-clock"></i>
                                            {new Date(announcement.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="announcement-actions">
                                    <span className={`priority-badge ${announcement.priority}`}>
                                        <i className={`fas fa-${announcement.priority === 'urgent' ? 'exclamation-triangle' : announcement.priority === 'important' ? 'exclamation-circle' : 'info-circle'}`}></i>
                                        {announcement.priority}
                                    </span>
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDelete(announcement.id)}
                                        title="Delete announcement"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="card-body">
                                <div className="announcement-content">
                                    <p>{announcement.content}</p>
                                </div>
                                {announcement.media_url && (
                                    <div className="announcement-media">
                                        {announcement.media_url.endsWith('.pdf') ? (
                                            <a 
                                                href={`${process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000'}${announcement.media_url}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="media-link pdf"
                                            >
                                                <i className="fas fa-file-pdf"></i>
                                                <span>View PDF Document</span>
                                            </a>
                                        ) : announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                            <div className="media-image">
                                                <img 
                                                    src={`${process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000'}${announcement.media_url}`} 
                                                    alt="Announcement media" 
                                                />
                                            </div>
                                        ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <div className="media-video">
                                                <video controls>
                                                    <source src={`${process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000'}${announcement.media_url}`} />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        ) : (
                                            <a 
                                                href={`${process.env.REACT_APP_API_URL || window.__API_BASE__ || 'http://localhost:5000'}${announcement.media_url}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="media-link file"
                                            >
                                                <i className="fas fa-file"></i>
                                                <span>View File</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                <div className="announcement-footer">
                                    <div className="footer-stats">
                                        <span className="stat-item">
                                            <i className="fas fa-comments"></i>
                                            {announcement.comment_count || 0} comments
                                        </span>
                                        <span className="stat-item">
                                            <i className="fas fa-smile"></i>
                                            {announcement.reaction_count || 0} reactions
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Enhanced Create Announcement Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Announcement</h3>
                            <button className="close-btn" onClick={() => setShowForm(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="announcement-form">
                            <div className="modal-body">
                                <div className="form-group">
                                    <label htmlFor="title">Title *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter announcement title..."
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="content">Content *</label>
                                    <textarea
                                        id="content"
                                        name="content"
                                        value={formData.content}
                                        onChange={handleChange}
                                        placeholder="Enter announcement content..."
                                        className="form-textarea"
                                        rows="6"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="priority">Priority</label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="important">Important</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="expires">Auto-Remove After</label>
                                    <select
                                        id="expires"
                                        name="expires_in_days"
                                        value={formData.expires_in_days}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="1">1 day</option>
                                        <option value="3">3 days</option>
                                        <option value="7">7 days</option>
                                        <option value="14">14 days</option>
                                        <option value="30">30 days</option>
                                        <option value="">Never</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="media">Media (Optional)</label>
                                    <input
                                        type="file"
                                        id="media"
                                        name="media"
                                        onChange={handleFileChange}
                                        accept="image/*,video/*,application/pdf"
                                        className="form-file"
                                    />
                                    {mediaPreview && (
                                        <div className="media-preview">
                                            {formData.media.type.startsWith('image/') ? (
                                                <img src={mediaPreview} alt="Preview" />
                                            ) : (
                                                <div className="file-preview">
                                                    <i className="fas fa-file"></i>
                                                    <span>{formData.media.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    <i className="fas fa-paper-plane"></i>
                                    Post Announcement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation modal for deletes */}
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onCancel={() => setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null })}
                onConfirm={() => {
                    const fn = confirmState.onConfirm;
                    setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null });
                    if (typeof fn === 'function') fn();
                }}
            />

            {/* Informational modal for success/errors */}
            <ConfirmationModal
                isOpen={infoState.isOpen}
                title={infoState.title}
                message={infoState.message}
                confirmText={infoState.confirmText}
                cancelText="Close"
                onCancel={() => setInfoState({ ...infoState, isOpen: false })}
                onConfirm={() => setInfoState({ ...infoState, isOpen: false })}
            />
        </div>
    );
};

export default AnnouncementPage;