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
            alert("Index posted successfully!");
        } catch (err) {
            console.error('Error posting announcement:', err); // Add better error logging
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

    if (loading) return <div>Loading announcements...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="admin-announcements">
            <h1>📢 Announcements Management</h1>
            <button onClick={() => setShowForm(true)}>+ Create New Index</button>

            {showForm && (
                <div className="announcement-form-modal">
                    <div className="form-container">
                        <h2>Create New Index</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Title:</label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Content:</label>
                                <textarea name="content" value={formData.content} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Priority:</label>
                                <select name="priority" value={formData.priority} onChange={handleChange}>
                                    <option value="normal">Normal</option>
                                    <option value="important">Important</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Media (Optional):</label>
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
                                <button type="submit">Post Index</button>
                                <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="announcements-list">
                {announcements.map(announcement => (
                    <div key={announcement.id} className="announcement-card">
                        <div className="announcement-header">
                            <h3>{announcement.title}</h3>
                            <span className={`priority ${announcement.priority}`}>
                {announcement.priority}
              </span>
                        </div>
                        <div className="announcement-content">
                            <p>{announcement.content}</p>
                            {announcement.media_url && (
                                <div className="announcement-media">
                                    {announcement.media_url.endsWith('.pdf') ? (
                                        <a href={`http://localhost:5000${announcement.media_url}`} target="_blank">View PDF</a>
                                    ) : announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                        <img src={`http://localhost:5000${announcement.media_url}`} alt="Index media" />
                                    ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                        <video controls>
                                            <source src={`http://localhost:5000${announcement.media_url}`} />
                                        </video>
                                    ) : (
                                        <a href={`http://localhost:5000${announcement.media_url}`} target="_blank">View File</a>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="announcement-footer">
                            <small>Posted on: {new Date(announcement.created_at).toLocaleString()}</small>
                            <small>Comments: {announcement.comment_count} | Reactions: {announcement.reaction_count}</small>
                            <button onClick={() => handleDelete(announcement.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementPage;