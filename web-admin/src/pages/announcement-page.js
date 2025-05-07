import React, { useState, useEffect } from "react";
import axios from "axios";
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
        media: null
    });

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/announcements");
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
            alert("Please fill in all required fields");
            return;
        }

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('content', formData.content);
            formDataToSend.append('priority', formData.priority);

            if (formData.media) {
                formDataToSend.append('media', formData.media);
            }

            await axios.post("http://localhost:5000/api/announcements", formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            const response = await axios.get("http://localhost:5000/api/announcements");
            setAnnouncements(response.data);
            setFormData({ title: "", content: "", priority: "normal", media: null });
            setMediaPreview(null);
            setShowForm(false);
            alert("Announcement posted successfully!");
        } catch (err) {
            console.error('Error posting announcement:', err);
            alert("Failed to post announcement");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;

        try {
            await axios.delete(`http://localhost:5000/api/announcements/${id}`, {
                headers: {
                    'x-clerk-id': localStorage.getItem('clerk_id')
                }
            });
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            alert("Failed to delete announcement");
        }
    };

    if (loading) return <div className="loading-message">Loading announcements...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="announcement-page-container modern-announcement-page">
            <div className="modern-header">
                <div className="header-left">
                    <i className="fas fa-bullhorn header-icon"></i>
                    <h1>Announcements</h1>
                </div>
                <button className="create-announcement-btn" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> New Announcement
                </button>
            </div>

            <div className="scrollable-content">
                {showForm && (
                    <div className="announcement-form-modal">
                        <div className="modal-overlay" onClick={() => setShowForm(false)}>
                            <div className="modal modern-modal" onClick={e => e.stopPropagation()}>
                                <h2>Create Announcement</h2>
                                <form onSubmit={handleSubmit} className="modern-form">
                                    <div className="form-group">
                                        <label>Title</label>
                                        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Content</label>
                                        <textarea name="content" value={formData.content} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Priority</label>
                                        <select name="priority" value={formData.priority} onChange={handleChange}>
                                            <option value="normal">Normal</option>
                                            <option value="important">Important</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Media (Optional)</label>
                                        <input type="file" name="media" onChange={handleFileChange} accept="image/*,video/*,application/pdf" />
                                        {mediaPreview && (
                                            <div className="media-preview">
                                                {formData.media.type.startsWith('image/') ? (
                                                    <img src={mediaPreview} alt="Preview" />
                                                ) : (
                                                    <div className="file-preview">
                                                        <span>{formData.media.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="primary-btn">Post</button>
                                        <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <div className="announcements-list modern-announcements-list">
                    {announcements.length === 0 ? (
                        <div className="empty-state modern-empty-state">
                            <i className="fas fa-bullhorn"></i>
                            <p>No announcements yet. Click "New Announcement" to get started!</p>
                        </div>
                    ) : (
                        announcements.map(announcement => (
                            <div key={announcement.id} className={`announcement-card modern-announcement-card ${announcement.priority}`}>
                                <div className="announcement-header">
                                    <h3>{announcement.title}</h3>
                                    <span className={`priority-badge ${announcement.priority}`}>{announcement.priority}</span>
                                </div>
                                <div className="announcement-content">
                                    <p>{announcement.content}</p>
                                    {announcement.media_url && (
                                        <div className="announcement-media">
                                            {announcement.media_url.endsWith('.pdf') ? (
                                                <a href={`http://localhost:5000${announcement.media_url}`} target="_blank" rel="noopener noreferrer">View PDF</a>
                                            ) : announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <img src={`http://localhost:5000${announcement.media_url}`} alt="Announcement media" />
                                            ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                                <video controls>
                                                    <source src={`http://localhost:5000${announcement.media_url}`} />
                                                </video>
                                            ) : (
                                                <a href={`http://localhost:5000${announcement.media_url}`} target="_blank" rel="noopener noreferrer">View File</a>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="announcement-footer modern-announcement-footer">
                                    <div className="footer-meta">
                                        <span><i className="fas fa-calendar-alt"></i> {new Date(announcement.created_at).toLocaleString()}</span>
                                        <span><i className="fas fa-comments"></i> {announcement.comment_count} </span>
                                        <span><i className="fas fa-smile"></i> {announcement.reaction_count} </span>
                                    </div>
                                    <button className="delete-btn" onClick={() => handleDelete(announcement.id)}>
                                        <i className="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementPage;