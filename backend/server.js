const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Setup for file storage using multer
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
    },
});

const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads"))); // Serve media

// Temporary in-memory store
let requests = [];

// Unified POST route
app.post("/api/requests", upload.single("media"), (req, res) => {
    const { type, description, document, reason, user, name, birthdate, userAddress, contact } = req.body;

    if (!type) {
        return res.status(400).json({ error: "Missing 'type' field in request" });
    }

    const baseRequest = {
        type,
        timestamp: new Date().toISOString(),
    };

    let savedRequest = {};

    switch (type) {
        case "Document Request":
            if (!document || !reason || !user) {
                return res.status(400).json({ error: "Missing fields for Document Request" });
            }

            savedRequest = {
                ...baseRequest,
                document,
                reason,
                user,
            };
            break;

        case "Create ID":
            if (!name || !birthdate || !userAddress || !contact || !user) {
                return res.status(400).json({ error: "Missing fields for Create ID" });
            }

            savedRequest = {
                ...baseRequest,
                name,
                birthdate,
                userAddress,
                contact,
                user,
            };
            break;

        case "Incident Report":
            if (!description || !req.file) {
                return res.status(400).json({ error: "Missing fields for Incident Report" });
            }

            const mediaUrl = `http://${req.hostname}:${PORT}/uploads/${req.file.filename}`;

            savedRequest = {
                ...baseRequest,
                description,
                media: mediaUrl,
                user: user || "Anonymous",
            };
            break;

        default:
            return res.status(400).json({ error: "Invalid request type" });
    }

    requests.push(savedRequest);
    console.log("New Request Received:", savedRequest);

    res.status(200).json(savedRequest);
});

// GET all requests
app.get("/api/requests", (req, res) => {
    res.status(200).json(requests);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
