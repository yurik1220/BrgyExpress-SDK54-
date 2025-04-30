const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 5000;

// File storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "public/uploads");
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// POST request handler
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

// GET all requests
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

// GET requests by clerk ID
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

// Update incident status
app.patch('/api/incidents/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
        return res.status(400).json({ error: "Missing incident ID or status" });
    }

    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        const result = await pool.query(
            `UPDATE incident_reports 
             SET status = $1, resolved_at = NOW()
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Incident not found" });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating incident:", error);
        res.status(500).json({ error: "Error updating incident status" });
    }
});

// Update document request status
// Update document request status
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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Document request not found" });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating document request:", error);
        res.status(500).json({ error: "Error updating document request status" });
    }
});

// Update ID request status
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

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "ID request not found" });
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