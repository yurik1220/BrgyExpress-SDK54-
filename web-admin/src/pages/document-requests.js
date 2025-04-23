import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Requests.css"; // You can rename this if needed

const DocumentRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDocumentRequests = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/requests");
                const filteredRequests = response.data.filter(
                    (request) => request.type === "Document Request"
                );
                setRequests(filteredRequests);
            } catch (error) {
                setError("Error fetching document requests");
            } finally {
                setLoading(false);
            }
        };

        fetchDocumentRequests();
    }, []);

    if (loading) return <p className="loading">Loading document requests...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="requests-container">
            <h2 className="section-title">📄 Document Requests</h2>
            {requests.length > 0 ? (
                <div className="card-grid">
                    {requests.map((request, index) => (
                        <div key={index} className="request-card">
                            <p><strong>📌 Type:</strong> {request.type}</p>
                            <p><strong>📃 Document:</strong> {request.document}</p>
                            <p><strong>✏️ Reason:</strong> {request.reason}</p>
                            <p><strong>👤 Submitted by:</strong> {request.user}</p>
                            {request.media ? (
                                <div>
                                    <strong>🖼️ Media:</strong><br />
                                    <img src={request.media} alt="media" width="100" />
                                </div>
                            ) : (
                                <p><em>No media provided.</em></p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-data">No document requests to display.</p>
            )}
        </div>
    );
};

export default DocumentRequests;
