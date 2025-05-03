const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { Expo } = require('expo-server-sdk');
require("dotenv").config();

const app = express();
const PORT = 5000;
const expo = new Expo();

// File storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "public/uploads");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, "public/uploads")));

// ========== NOTIFICATION FUNCTIONS ========== //
async function sendPushNotification(userId, title, body, data) {
    try {
        const result = await pool.query(
            'SELECT push_token FROM user_push_tokens WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].push_token) {
            console.log(`No push token registered for user: ${userId}`);
            return { sent: false, error: 'No token registered' };
        }

        const pushToken = result.rows[0].push_token;

        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Invalid Expo push token for user ${userId}`);
            return { sent: false, error: 'Invalid token format' };
        }

        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data: {
                ...data,
                userId: userId.toString()
            },
        };

        const ticket = await expo.sendPushNotificationsAsync([message]);
        console.log('Notification sent:', ticket);
        return { sent: true, ticket };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { sent: false, error: error.message };
    }
}

// ========== NOTIFICATION ENDPOINT ========== //
app.post('/api/save-push-token', async (req, res) => {
    const { userId, pushToken } = req.body;
    console.log('Saving push token for user:', userId);

    if (!userId || !pushToken) {
        return res.status(400).json({ error: "Missing userId or pushToken" });
    }

    try {
        await pool.query(
            'INSERT INTO user_push_tokens (user_id, push_token) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET push_token = $2, updated_at = NOW()',
            [userId, pushToken]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving push token:', error);
        res.status(500).json({ error: 'Failed to save push token' });
    }
});

// ========== ANNOUNCEMENTS ENDPOINTS ========== //
app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await pool.query(
            `SELECT a.*,
                    (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = a.id) as comment_count,
                    (SELECT COUNT(*) FROM announcement_reactions WHERE announcement_id = a.id) as reaction_count
             FROM announcements a
             ORDER BY a.created_at DESC`
        );
        res.status(200).json(announcements.rows);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

app.get('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: "Invalid announcement ID" });
    }
    try {
        const announcement = await pool.query(
            `SELECT a.*,
                    (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = a.id) as comment_count,
                    (SELECT COUNT(*) FROM announcement_reactions WHERE announcement_id = a.id) as reaction_count
             FROM announcements a
             WHERE a.id = $1`,
            [id]
        );

        if (announcement.rows.length === 0) {
            return res.status(404).json({ error: "Index not found" });
        }

        res.status(200).json(announcement.rows[0]);
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ error: 'Failed to fetch announcement' });
    }
});

app.post('/api/announcements', upload.single('media'), async (req, res) => {
    console.log('Received announcement post request');
    const { title, content, priority } = req.body;
    const mediaFile = req.file;

    // Validation
    if (!title || !content || !priority) {
        if (mediaFile) {
            try {
                fs.unlinkSync(mediaFile.path); // Clean up file
            } catch (cleanupErr) {
                console.error('Error cleaning up file:', cleanupErr);
            }
        }
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const mediaUrl = mediaFile ? `/uploads/${mediaFile.filename}` : null;

        const result = await pool.query(
            `INSERT INTO announcements
                 (title, content, priority, media_url, created_at)
             VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
            [title, content, priority, mediaUrl]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        // Clean up file if database operation fails
        if (mediaFile) {
            try {
                fs.unlinkSync(mediaFile.path);
            } catch (cleanupErr) {
                console.error('Error cleaning up file:', cleanupErr);
            }
        }
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

app.delete('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Get announcement to check for media file
        const announcement = await pool.query(
            'SELECT * FROM announcements WHERE id = $1',
            [id]
        );

        if (announcement.rows.length === 0) {
            return res.status(404).json({ error: "Index not found" });
        }

        // Delete associated media file if exists
        if (announcement.rows[0].media_url) {
            const filePath = path.join(__dirname, 'public', announcement.rows[0].media_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete the announcement
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// ========== REACTION ENDPOINTS ========== //
app.post('/api/announcements/:id/reactions', async (req, res) => {
    const { id } = req.params;
    const { clerk_id, reaction_type } = req.body;

    if (!clerk_id || !reaction_type) {
        return res.status(400).json({ error: "Missing clerk_id or reaction_type" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO announcement_reactions
                 (announcement_id, clerk_id, reaction_type)
             VALUES ($1, $2, $3)
                 ON CONFLICT (announcement_id, clerk_id) 
             DO UPDATE SET reaction_type = $3
                                     RETURNING *`,
            [id, clerk_id, reaction_type]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving reaction:', error);
        res.status(500).json({ error: 'Failed to save reaction' });
    }
});

app.get('/api/announcements/:id/reactions', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT reaction_type, COUNT(*) as count 
             FROM announcement_reactions 
             WHERE announcement_id = $1
             GROUP BY reaction_type`,
            [id]
        );

        const reactions = result.rows.reduce((acc, row) => {
            acc[row.reaction_type] = parseInt(row.count);
            return acc;
        }, {});

        res.status(200).json(reactions);
    } catch (error) {
        console.error('Error fetching reactions:', error);
        res.status(500).json({ error: 'Failed to fetch reactions' });
    }
});

// ========== COMMENT ENDPOINTS ========== //
app.post('/api/announcements/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { clerk_id, content } = req.body;

    if (!clerk_id || !content) {
        return res.status(400).json({ error: "Missing clerk_id or content" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO announcement_comments 
             (announcement_id, clerk_id, content)
             VALUES ($1, $2, $3)
             RETURNING *, 
             (SELECT name FROM users WHERE clerk_id = $2) as name,
             (SELECT phonenumber FROM users WHERE clerk_id = $2) as phonenumber`,
            [id, clerk_id, content]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

app.get('/api/announcements/:id/comments', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT c.*, u.name, u.phonenumber
             FROM announcement_comments c
                      JOIN users u ON c.clerk_id = u.clerk_id
             WHERE c.announcement_id = $1
             ORDER BY c.created_at ASC`,
            [id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// ========== USER PROFILE ENDPOINTS ========== //
app.get("/api/users/:clerkID", async (req, res) => {
    const { clerkID } = req.params;

    try {
        const userQuery = await pool.query(
            "SELECT id, name, clerk_id FROM users WHERE clerk_id = $1",
            [clerkID]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = userQuery.rows[0];
        const [documents, ids, incidents] = await Promise.all([
            pool.query("SELECT status FROM document_requests WHERE clerk_id = $1", [clerkID]),
            pool.query("SELECT status FROM id_requests WHERE clerk_id = $1", [clerkID]),
            pool.query("SELECT status FROM incident_reports WHERE clerk_id = $1", [clerkID])
        ]);

        const completedCount = [
            ...documents.rows,
            ...ids.rows,
            ...incidents.rows
        ].filter(req => req.status === 'approved').length;

        const pendingCount = [
            ...documents.rows,
            ...ids.rows,
            ...incidents.rows
        ].filter(req => req.status === 'pending').length;

        const memberSince = await pool.query(
            `SELECT MIN(created_at) as earliest_date FROM (
                SELECT created_at FROM document_requests WHERE clerk_id = $1
                UNION ALL
                SELECT created_at FROM id_requests WHERE clerk_id = $1
                UNION ALL
                SELECT created_at FROM incident_reports WHERE clerk_id = $1
            ) AS all_requests`,
            [clerkID]
        );

        const response = {
            id: user.id,
            name: user.name,
            clerk_id: user.clerk_id,
            requests_completed: completedCount,
            requests_pending: pendingCount,
            member_since: memberSince.rows[0].earliest_date || new Date().toISOString()
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Error fetching user profile" });
    }
});

app.patch("/api/users/:clerkID", async (req, res) => {
    const { clerkID } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    try {
        const result = await pool.query(
            "UPDATE users SET name = $1 WHERE clerk_id = $2 RETURNING *",
            [name, clerkID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Error updating user profile" });
    }
});

// ========== REQUEST ENDPOINTS WITH NOTIFICATIONS ========== //
app.post("/api/requests", upload.single("media"), async (req, res) => {
    const { type, document_type, reason, clerk_id, full_name, birth_date, address, contact, description, title, location } = req.body;
    const mediaFile = req.file;

    if (!type) {
        return res.status(400).json({ error: "Missing 'type' field in request" });
    }

    const timestamp = new Date().toISOString();

    try {
        switch (type) {
            case "Document Request":
                if (!reason || !clerk_id) {
                    return res.status(400).json({ error: "Missing fields for Document Request" });
                }

                const docResult = await pool.query(
                    "INSERT INTO document_requests(document_type, reason, clerk_id, created_at) VALUES($1, $2, $3, $4) RETURNING *",
                    [document_type, reason, clerk_id, timestamp]
                );
                return res.status(200).json(docResult.rows[0]);

            case "Create ID":
                if (!full_name || !birth_date || !address || !contact || !clerk_id) {
                    return res.status(400).json({ error: "Missing fields for Create ID" });
                }

                const idResult = await pool.query(
                    "INSERT INTO id_requests(full_name, birth_date, address, contact, clerk_id, created_at) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
                    [full_name, birth_date, address, contact, clerk_id, timestamp]
                );
                return res.status(200).json(idResult.rows[0]);

            case "Incident Report":
                if (!title || !description || !location || !clerk_id) {
                    return res.status(400).json({
                        error: "Missing fields for Incident Report",
                        required: ["title", "description", "location", "clerk_id"]
                    });
                }

                const mediaUrl = mediaFile ? `/uploads/${mediaFile.filename}` : null;
                const incidentResult = await pool.query(
                    `INSERT INTO incident_reports
                     (title, description, media_url, location, clerk_id, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
                     RETURNING *`,
                    [title, description, mediaUrl, location, clerk_id, timestamp]
                );
                return res.status(200).json(incidentResult.rows[0]);

            default:
                return res.status(400).json({ error: "Invalid request type" });
        }
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Error saving request to database" });
    }
});

app.get("/api/requests", async (req, res) => {
    try {
        const [documentRequests, idRequests, incidentReports] = await Promise.all([
            pool.query("SELECT *, 'Document Request' as type FROM document_requests"),
            pool.query("SELECT *, 'Create ID' as type FROM id_requests"),
            pool.query("SELECT *, 'Incident Report' as type FROM incident_reports")
        ]);

        res.status(200).json([
            ...documentRequests.rows,
            ...idRequests.rows,
            ...incidentReports.rows
        ]);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: "Error fetching requests from database" });
    }
});

app.get("/api/requests/:clerkID", async (req, res) => {
    const { clerkID } = req.params;
    try {
        const [documents, ids, incidents] = await Promise.all([
            pool.query("SELECT *, 'Document Request' as type FROM document_requests WHERE clerk_id = $1", [clerkID]),
            pool.query("SELECT *, 'Create ID' as type FROM id_requests WHERE clerk_id = $1", [clerkID]),
            pool.query("SELECT *, 'Incident Report' as type FROM incident_reports WHERE clerk_id = $1", [clerkID])
        ]);

        res.status(200).json([
            ...documents.rows,
            ...ids.rows,
            ...incidents.rows
        ]);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: "Error fetching requests from database" });
    }
});

app.patch('/api/incidents/:id', async (req, res) => {
    const { id } = req.params;
    const { status, resolved_at } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "Missing incident ID or status" });
    }

    const validStatuses = ['in_progress', 'closed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const request = await pool.query(
            'SELECT * FROM incident_reports WHERE id = $1',
            [id]
        );

        if (request.rows.length === 0) {
            return res.status(404).json({ error: "Incident not found" });
        }

        const result = await pool.query(
            `UPDATE incident_reports
             SET status = $1, resolved_at = $3
             WHERE id = $2
                 RETURNING *`,
            [status, id, status === 'closed' ? (resolved_at || new Date().toISOString()) : null]
        );

        if (request.rows[0].clerk_id) {
            const notificationResult = await sendPushNotification(
                request.rows[0].clerk_id,
                `Incident Report Update`,
                status === 'in_progress'
                    ? 'Your incident report is now being processed'
                    : 'Your incident report has been closed',
                {
                    requestId: id,
                    type: 'Incident Report',
                    status
                }
            );

            if (!notificationResult.sent) {
                console.warn('Failed to send notification:', notificationResult.error);
            }
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating incident:", error);
        res.status(500).json({ error: "Error updating incident status" });
    }
});

app.patch('/api/document-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason, appointment_date } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "Missing document request ID or status" });
    }

    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const request = await pool.query(
            'SELECT * FROM document_requests WHERE id = $1',
            [id]
        );

        if (request.rows.length === 0) {
            return res.status(404).json({ error: "Document request not found" });
        }

        const query = status === 'approved'
            ? `UPDATE document_requests
               SET status = $1, resolved_at = NOW(), appointment_date = $3
               WHERE id = $2
               RETURNING *`
            : `UPDATE document_requests
               SET status = $1, rejection_reason = $3, resolved_at = NOW()
               WHERE id = $2
               RETURNING *`;

        const values = status === 'approved'
            ? [status, id, appointment_date]
            : [status, id, rejection_reason];

        const result = await pool.query(query, values);

        if (request.rows[0].clerk_id) {
            const notificationResult = await sendPushNotification(
                request.rows[0].clerk_id,
                `Document Request ${status}`,
                status === 'approved'
                    ? `Your document request has been approved! Pickup date: ${appointment_date}`
                    : `Your document request was rejected. Reason: ${rejection_reason}`,
                {
                    requestId: id,
                    type: 'Document Request',
                    status,
                    appointmentDate: appointment_date,
                    rejectionReason: rejection_reason
                }
            );

            if (!notificationResult.sent) {
                console.warn('Failed to send notification:', notificationResult.error);
            }
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating document request:", error);
        res.status(500).json({ error: "Error updating document request status" });
    }
});

app.patch('/api/id-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason, appointment_date } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "Missing ID request ID or status" });
    }

    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const request = await pool.query(
            'SELECT * FROM id_requests WHERE id = $1',
            [id]
        );

        if (request.rows.length === 0) {
            return res.status(404).json({ error: "ID request not found" });
        }

        const query = status === 'approved'
            ? `UPDATE id_requests
               SET status = $1, resolved_at = NOW(), appointment_date = $3
               WHERE id = $2
               RETURNING *`
            : `UPDATE id_requests
               SET status = $1, rejection_reason = $3, resolved_at = NOW()
               WHERE id = $2
               RETURNING *`;

        const values = status === 'approved'
            ? [status, id, appointment_date]
            : [status, id, rejection_reason];

        const result = await pool.query(query, values);

        if (request.rows[0].clerk_id) {
            const notificationResult = await sendPushNotification(
                request.rows[0].clerk_id,
                `ID Request ${status}`,
                status === 'approved'
                    ? `Your ID creation request has been approved! Pickup date: ${appointment_date}`
                    : `Your ID creation request was rejected. Reason: ${rejection_reason}`,
                {
                    requestId: id,
                    type: 'Create ID',
                    status,
                    appointmentDate: appointment_date,
                    rejectionReason: rejection_reason
                }
            );

            if (!notificationResult.sent) {
                console.warn('Failed to send notification:', notificationResult.error);
            }
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating ID request:", error);
        res.status(500).json({ error: "Error updating ID request status" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});