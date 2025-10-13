/*
  BEGINNER PRIMER (Read once, then skim the code below):
  - const vs let vs var:
    • const declares a variable that won't be reassigned (safer defaults). The value can be an object/array that you can still mutate, but you cannot reassign the variable name itself.
    • let declares a block-scoped variable you can reassign. Prefer this only when you truly need reassignment.
    • var is function-scoped and has hoisting quirks; avoid it in modern code.

  - require("module"): CommonJS import used in Node.js to load a library. The returned value is whatever the module exports.
  - async/await: async marks a function as asynchronous; await pauses inside async functions until a Promise resolves (like "wait for this to finish").
  - Arrow functions: (args) => { ... } compact syntax for functions; they capture "this" from the surrounding scope.
  - Objects and arrays: { key: value } is an object; [a, b, c] is an array. Use dot or bracket notation to access properties.
  - Template strings: `Hello ${name}` allows embedding expressions with ${} inside backticks.
  - Middleware (Express): functions that run before your route handler; can read/modify req/res or block/continue the request.
  - HTTP methods: GET (read), POST (create), PATCH/PUT (update), DELETE (remove). res.status(code).json(obj) sends a response with JSON.
  - Try/Catch: try { ... } catch (err) { ... } handles errors thrown inside try.
  - Environment variables: process.env.X are configuration values supplied outside the code (e.g., from a .env file).
*/

// Core dependencies and third-party libraries used by the Express backend
// express: HTTP server and routing
// cors: Cross-Origin Resource Sharing to allow frontend/mobile to call the API
// multer: Handle multipart/form-data for file uploads (images, etc.)
// path, fs: Node.js utilities for file system paths and reading/writing files
// pg: PostgreSQL client
// expo-server-sdk: Send push notifications to Expo devices
// bcrypt: Secure password hashing and verification for admin users
// express-rate-limit, helmet: Basic security hardening
// sharp, qrcode: Image processing and QR code generation for ID cards
// express-validator: Input validation for safer request handling
// const defines a read-only binding to the imported module; we won't reassign these names
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require('crypto');
// { Pool } pulls the Pool export from the pg module using object destructuring
const { Pool } = require("pg");
const { Expo } = require('expo-server-sdk');
const axios = require('axios');
const FormData = require('form-data');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sharp = require('sharp');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
// Load environment variables from .env into process.env
require("dotenv").config();
// (Model API integrations removed)

// Initialize the Express application and global utilities
// Create our Express app instance; this is the main server object
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000; // Use Render's PORT when provided
const expo = new Expo(); // Expo notifications client used for push notifications
const IS_PROD = process.env.NODE_ENV === 'production';

// Log server startup
// console.log prints messages to the server terminal (useful for debugging/visibility)
console.log('🚀 Starting BrgyExpress Backend Server...');
console.log(`📡 Server will run on port ${PORT}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

// File storage setup: configure multer to store uploads in backend/public/uploads
// When a file is uploaded, ensure the directory exists and save with a timestamped name
// Configure how multer stores files on disk: destination (folder) and filename (string)
const storage = multer.diskStorage({
    // destination: tells multer where to save uploaded files
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "public/uploads");
        // If the folder doesn't exist, create it (recursive ensures parent folders too)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    // filename: control how the uploaded file is named on disk
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

// Create the multer middleware using the storage settings and file size limits
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Memory storage for DB-backed uploads (avoids ephemeral disk)
const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Database connection: connect once using a Pool. The DATABASE_URL should be set in .env
// Create a reusable connection pool for PostgreSQL
const pool = new Pool({
    // Read the database connection string from environment variables
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// On startup: test DB connectivity and ensure important columns/tables exist.
// This function avoids migration tools for simplicity by using ALTER TABLE IF NOT EXISTS.
let hasIdImageColumns = false;

// async means this function can use await inside it
async function ensureSchema() {
    try {
        // await pauses until the database returns the current timestamp
        const resNow = await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        console.log(`🗄️ Database timestamp: ${resNow.rows[0].now}`);

        // Add image URL and profile columns for id_requests if missing
        // ALTER TABLE ... IF NOT EXISTS: add columns only if they're missing
        await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS id_image_url TEXT");
        await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS selfie_image_url TEXT");
        await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS sex TEXT");
        await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS civil_status TEXT");
        await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS signature_url TEXT");
        // Query information_schema to check which columns currently exist
        const colCheck = await pool.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name='id_requests' AND column_name IN ('id_image_url','selfie_image_url')`
        );
        // .map creates a new array of just the column_name values
        const names = colCheck.rows.map(r => r.column_name);
        // Remember in memory whether both columns are present
        hasIdImageColumns = names.includes('id_image_url') && names.includes('selfie_image_url');
        console.log(`🗂️ id_requests image columns present: ${hasIdImageColumns}`);

        // Ensure announcements has expires_at column for auto-expiry
        await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");

        // Ensure users table has required profile/status columns for account maintenance
        try {
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contact TEXT");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_image_url TEXT");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS id_image_url TEXT");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ");
            // Backfill created_at if null
            await pool.query("UPDATE users SET created_at = NOW() WHERE created_at IS NULL");
        } catch (e) {
            console.warn('Users schema ensure failed or partially applied:', e?.message || e);
        }

        // Ensure id_requests has verification-related columns
        try {
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS id_type TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS id_number TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS name_on_id TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS birthdate_on_id DATE");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS address_on_id TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS reference_number TEXT");
            // Meralco bill analysis fields
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS bill_image_url TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS bill_prob_tampered DOUBLE PRECISION");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS bill_pred_label TEXT");
            await pool.query("ALTER TABLE id_requests ADD COLUMN IF NOT EXISTS bill_threshold_used DOUBLE PRECISION");
        } catch (e) {
            console.warn('ID request schema ensure failed or partially applied:', e?.message || e);
        }

        // Create table for DB-backed file uploads (persisted in Postgres)
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS file_uploads (
                    id TEXT PRIMARY KEY,
                    filename TEXT,
                    mime_type TEXT,
                    content BYTEA NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
        } catch (e) {
            console.warn('file_uploads schema ensure failed or partially applied:', e?.message || e);
        }
    } catch (err) {
        console.error('❌ Database connection/schema ensure failed:', err.message);
    }
}

ensureSchema();

// Helper: refresh the in-memory flag for presence of image columns
// Recompute the hasIdImageColumns flag on demand (used before certain inserts)
async function refreshIdImageColumnsFlag() {
    try {
        const colCheck = await pool.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name='id_requests' AND column_name IN ('id_image_url','selfie_image_url')`
        );
        const names = colCheck.rows.map(r => r.column_name);
        hasIdImageColumns = names.includes('id_image_url') && names.includes('selfie_image_url');
    } catch (e) {
        // ignore
    }
}

// Note: audit_logs table should be created externally using the SQL script
console.log('📋 Audit logging system ready (table must exist in database)');

// Admin Authentication Middleware
// Attempts to read admin identity from a simple base64 token (for demo purposes)
// and from an optional admin_username added by the web-admin client in request bodies.
// Express middleware signature: (req, res, next)
// next() passes control to the next middleware/route handler
const extractAdminInfo = async (req, res, next) => {
    try {
        // Try to get admin info from Authorization header
        // HTTP headers are in req.headers; authorization typically contains a token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            // Remove the 'Bearer ' prefix to get the raw token string
            const token = authHeader.substring(7);
            // Decode the simple token (in production, use JWT)
            try {
                // Convert from base64 to a normal string like "<id>:<timestamp>"
                const decoded = Buffer.from(token, 'base64').toString();
                const [adminId] = decoded.split(':');
                if (adminId) {
                    // Get admin details from database
                    // Look up the admin by id to attach identity info to req
                    const result = await pool.query(
                        'SELECT id, username FROM admins WHERE id = $1',
                        [adminId]
                    );
                    if (result.rows.length > 0) {
                        req.adminInfo = result.rows[0];
                    }
                }
            } catch (e) {
                // Token decode failed, continue without admin info
            }
        }
        
        // Also check for admin info in request body
        if (req.body && req.body.admin_username) {
            req.adminInfo = req.adminInfo || {};
            req.adminInfo.username = req.body.admin_username; // Prefer explicit username if provided
        }
        
        next();
    } catch (error) {
        console.error('❌ Error extracting admin info:', error);
        next();
    }
};

// Audit Log Middleware
// Wraps res.send to capture request/response details for persistence in audit_logs.
// It extracts admin identity from middleware/body/response and sanitizes sensitive fields.
// Higher-order function: returns middleware configured with a specific action label
const auditLog = (action) => {
    return async (req, res, next) => {
        // Keep a reference to the original res.send so we can call it later
        const originalSend = res.send;
        
        res.send = function(data) {
            // Delay the logging slightly to ensure response is already flushed
            setTimeout(async () => {
                try {
                    // Try to get admin info from various sources
                    let adminId = null;
                    let adminUsername = 'unknown';
                    
                    // First, check if admin info was extracted by middleware
                    if (req.adminInfo) {
                        adminUsername = req.adminInfo.username || 'unknown';
                        adminId = req.adminInfo.id || null;
                    }
                    
                    // Check request body for admin data
                    if (!adminId && req.body && req.body.username) {
                        adminUsername = req.body.username;
                    }
                    
                    // Check for admin data in response (for successful logins)
                    if (typeof data === 'string') {
                        try {
                            const responseData = JSON.parse(data);
                            if (responseData.admin && responseData.admin.username) {
                                adminUsername = responseData.admin.username;
                                adminId = responseData.admin.id;
                            }
                        } catch (e) {
                            // Response is not JSON, continue with request body data
                        }
                    }
                    
                    // Sanitize details to avoid sensitive data
                    const sanitizedBody = { ...req.body };
                    if (sanitizedBody.password) {
                        sanitizedBody.password = '[REDACTED]';
                    }
                    
                    // Enhanced details with more context
                    const details = JSON.stringify({
                        method: req.method,
                        path: req.path,
                        params: req.params,
                        query: req.query,
                        body: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? sanitizedBody : null,
                        responseStatus: res.statusCode,
                        responseSuccess: (() => {
                            // Check if response indicates success
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                if (typeof data === 'string') {
                                    try {
                                        const parsed = JSON.parse(data);
                                        return parsed.success !== false; // true if success is not explicitly false
                                    } catch {
                                        return true; // If it's not JSON, assume success for 2xx status
                                    }
                                } else {
                                    return data && data.success !== false; // true if success is not explicitly false
                                }
                            }
                            return false; // Any non-2xx status is failure
                        })(),
                        timestamp: new Date().toISOString(),
                        userAgent: req.get('User-Agent'),
                        referer: req.get('Referer')
                    });
                    
                    await pool.query(
                        'INSERT INTO audit_logs (admin_id, admin_username, action, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
                        [adminId, adminUsername, action, details, req.ip, req.get('User-Agent')]
                    );
                    
                    console.log(`📝 Audit log: ${action} by ${adminUsername} (${req.ip}) - Status: ${res.statusCode}`);
                } catch (error) {
                    console.error('❌ Audit log error:', error);
                }
            }, 100);
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: (() => { const arr = ["'self'", "data:", "https:"]; if (!IS_PROD) arr.push("http:"); return arr; })(),
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginResourcePolicy: { policy: IS_PROD ? 'same-origin' : 'cross-origin' },
    crossOriginEmbedderPolicy: false,
}));

// If behind a proxy (Heroku/Render), trust proxy so req.protocol is accurate
app.set('trust proxy', 1);
console.log('🛡️ Security middleware (Helmet) configured');

// Rate Limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5  , // 5 attempts per window
    message: { 
        error: 'Too many login attempts. Please try again in 15 minutes.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { 
        error: 'Too many requests. Please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
// Serve DB-backed uploads via /uploads/:id before static middleware
app.get('/uploads/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || id.includes('/') || id.includes('..')) return res.status(400).send('Bad request');
        const result = await pool.query('SELECT filename, mime_type, content FROM file_uploads WHERE id = $1', [id]);
        if (result.rows.length === 0) return next(); // fall through to static or 404
        const row = result.rows[0];
        // Allow cross-origin embedding of images in admin panel
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        const dispositionName = row.filename || `${id}`;
        res.setHeader('Content-Disposition', `inline; filename="${dispositionName.replace(/"/g, '')}"`);
        return res.send(Buffer.from(row.content));
    } catch (e) {
        return next(e);
    }
});

// Ensure static uploads also allow cross-origin embedding
app.use('/uploads', (req, res, next) => { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); next(); });
app.use('/uploads', express.static(path.join(__dirname, "public/uploads")));
app.use(generalLimiter);

console.log('🔧 Middleware configured: CORS, JSON parsing, static files, rate limiting');

// Image Forgery Model API base (default to provided endpoint, can be overridden)
const MODEL_API_BASE = (process.env.MODEL_API_URL && process.env.MODEL_API_URL.trim()) || 'https://image-forgery-api-3kdo.onrender.com';

async function analyzeLocalFileWithModel(localPath) {
    try {
        if (!localPath || !fs.existsSync(localPath)) return null;
        console.log('[bill-analysis] analyzeLocalFileWithModel path=', localPath);
        const form = new FormData();
        form.append('file', fs.createReadStream(localPath), {
            filename: path.basename(localPath),
            contentType: 'image/jpeg'
        });
        const url = MODEL_API_BASE.replace(/\/$/, '') + '/predict';
        console.log('[bill-analysis] POST', url);
        const resp = await axios.post(url, form, { headers: form.getHeaders(), timeout: 20000, validateStatus: () => true });
        console.log('[bill-analysis] model status=', resp.status);
        const a = resp.data || {};
        const prob = typeof a.prob_tampered === 'number' ? a.prob_tampered : (typeof a.prob === 'number' ? a.prob : null);
        const label = a.pred_label || a.label || null;
        const threshold = a.threshold_used || a.threshold || null;
        if (prob === null) return null;
        return { prob, label, threshold };
    } catch (e) {
        console.warn('Model analyze error:', e?.response?.status || e?.message || e);
        return null;
    }
}

async function analyzeRemoteUrlWithModel(imageUrl) {
    try {
        if (!imageUrl) return null;
        console.log('[bill-analysis] analyzeRemoteUrlWithModel url=', imageUrl);
        const form = new FormData();
        // Many model servers accept either file or url; this one expects file.
        // Fetch remote into buffer then send as file.
        const r = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000, validateStatus: () => true });
        console.log('[bill-analysis] fetch bill status=', r.status, 'content-type=', r.headers['content-type']);
        if (r.status < 200 || r.status >= 300) return null;
        const buf = Buffer.from(r.data);
        form.append('file', buf, { filename: 'image.jpg', contentType: r.headers['content-type'] || 'image/jpeg' });
        const url = MODEL_API_BASE.replace(/\/$/, '') + '/predict';
        console.log('[bill-analysis] POST', url);
        const resp = await axios.post(url, form, { headers: form.getHeaders(), timeout: 20000, validateStatus: () => true });
        console.log('[bill-analysis] model status=', resp.status);
        const a = resp.data || {};
        const prob = typeof a.prob_tampered === 'number' ? a.prob_tampered : (typeof a.prob === 'number' ? a.prob : null);
        const label = a.pred_label || a.label || null;
        const threshold = a.threshold_used || a.threshold || null;
        if (prob === null) return null;
        return { prob, label, threshold };
    } catch (e) {
        console.warn('Model analyze remote error:', e?.response?.status || e?.message || e);
        return null;
    }
}

// Simple image upload endpoint for mobile to use before creating requests
app.post('/api/upload-image', memUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image uploaded' });
        }
        // Persist image in Postgres
        const id = (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(36) + '-' + Math.random().toString(16).slice(2));
        const filename = req.file.originalname || `image-${Date.now()}.jpg`;
        const mimeType = req.file.mimetype || 'application/octet-stream';
        await pool.query(
            'INSERT INTO file_uploads (id, filename, mime_type, content) VALUES ($1, $2, $3, $4)',
            [id, filename, mimeType, req.file.buffer]
        );
        const relativePath = `/uploads/${id}`;
        const absoluteUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
        return res.status(200).json({ success: true, url: absoluteUrl, path: relativePath });
    } catch (error) {
        console.error('❌ Image upload error:', error);
        return res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
});

// (Model API endpoints removed)

// ========== ADMIN AUTHENTICATION ENDPOINTS ========== //
console.log('🔐 Setting up admin authentication endpoints...');

// Admin Session Check Endpoint
app.get('/api/admin/session', generalLimiter, async (req, res) => {
    console.log('🔍 Checking admin session...');
    
    try {
        // In a real implementation, you would validate the token here
        // For now, we'll just return success if the endpoint is accessible
        res.status(200).json({
            success: true,
            message: 'Session valid',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Session check error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Session invalid' 
        });
    }
});

// Admin Logout Endpoint
app.post('/api/admin/logout', auditLog('Admin Logout'), async (req, res) => {
    console.log('🚪 Admin logout request');
    
    try {
        // In a real implementation, you might invalidate tokens here
        console.log('✅ Admin logout successful');
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('❌ Admin logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get Audit Logs Endpoint
app.get('/api/admin/audit-logs', generalLimiter, async (req, res) => {
    console.log('📋 Fetching audit logs...');
    
    try {
        const { page = 1, limit = 50, action, admin_username, start_date, end_date } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (action) {
            paramCount++;
            if (action === 'Update') {
                // For "Update" filter, match all update actions
                query += ` AND (action ILIKE $${paramCount} OR action ILIKE $${paramCount + 1} OR action ILIKE $${paramCount + 2} OR action ILIKE $${paramCount + 3})`;
                params.push('Update Document Request%', 'Update ID Request%', 'Update Incident Report%', 'Update Announcement%');
                paramCount += 3; // Adjust for the additional parameters
            } else {
                query += ` AND action ILIKE $${paramCount}`;
                params.push(`%${action}%`);
            }
        }
        
        if (admin_username) {
            paramCount++;
            query += ` AND admin_username ILIKE $${paramCount}`;
            params.push(`%${admin_username}%`);
        }
        
        if (start_date) {
            paramCount++;
            query += ` AND timestamp >= $${paramCount}`;
            params.push(start_date);
        }
        
        if (end_date) {
            paramCount++;
            query += ` AND timestamp <= $${paramCount}`;
            params.push(end_date);
        }
        
        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        const countResult = await pool.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Get paginated results
        query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), offset);
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Retrieved ${result.rows.length} audit logs (page ${page})`);
        
        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching audit logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch audit logs' 
        });
    }
});

app.post('/api/admin/login', loginLimiter, auditLog('Admin Login'), [
    body('username')
        .trim()
        .escape()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    // Admin login flow:
    // 1) Validate input; 2) Fetch admin by username; 3) Verify bcrypt password
    // 4) Generate a simple session token; 5) Return admin (without password) + token
    console.log('🔑 Admin login attempt:', { username: req.body.username, timestamp: new Date().toISOString() });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Login validation failed:', errors.array());
        return res.status(400).json({ 
            success: false, 
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { username, password } = req.body;

    try {
        console.log('🔍 Querying admin from database...');
        
        // Query admin from database
        const result = await pool.query(
            'SELECT id, username, password, full_name, role FROM admins WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            console.log('❌ Admin not found:', username);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        const admin = result.rows[0];
        console.log('✅ Admin found:', { id: admin.id, username: admin.username, role: admin.role });

        // Compare password with bcrypt
        console.log('🔐 Verifying password with bcrypt...');
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            console.log('❌ Password verification failed for admin:', username);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        console.log('✅ Password verified successfully');

        // Remove password from response
        const { password: _, ...adminData } = admin;

        // Create a simple token (in production, use JWT)
        const token = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64');
        console.log('🎫 Token generated for admin:', admin.username);

        console.log('✅ Admin login successful:', { username: admin.username, role: admin.role });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            admin: adminData,
            token: token
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Admin Registration Endpoint (for creating new admin users)
// Registers admins with bcrypt-hashed passwords and basic role control (admin/super_admin)
app.post('/api/admin/register', auditLog('Admin Registration'), [
    body('username')
        .trim()
        .escape()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('full_name')
        .trim()
        .escape()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('role')
        .optional()
        .isIn(['admin', 'super_admin'])
        .withMessage('Role must be either admin or super_admin')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { username, password, full_name, role = 'admin' } = req.body;

    try {
        // Check if username already exists
        const existingAdmin = await pool.query(
            'SELECT id FROM admins WHERE username = $1',
            [username]
        );

        if (existingAdmin.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        // Hash password with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new admin with hashed password
        const result = await pool.query(
            'INSERT INTO admins (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
            [username, hashedPassword, full_name, role]
        );

        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Utility endpoint to create admin with hashed password (for initial setup)
app.post('/api/admin/create', auditLog('Admin Creation'), [
    body('username')
        .trim()
        .escape()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('full_name')
        .trim()
        .escape()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('role')
        .optional()
        .isIn(['admin', 'super_admin'])
        .withMessage('Role must be either admin or super_admin')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    const { username, password, full_name, role = 'admin' } = req.body;

    try {
        // Check if username already exists
        const existingAdmin = await pool.query(
            'SELECT id FROM admins WHERE username = $1',
            [username]
        );

        if (existingAdmin.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        // Hash password with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new admin with hashed password
        const result = await pool.query(
            'INSERT INTO admins (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, role',
            [username, hashedPassword, full_name, role]
        );

        res.status(201).json({
            success: true,
            message: 'Admin user created successfully with hashed password',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// ========== ANALYTICS ENDPOINTS ========== //
console.log('📊 Setting up analytics endpoints...');

// Get analytics data
app.get('/api/analytics/overview', generalLimiter, auditLog('Analytics Overview'), async (req, res) => {
    try {
        // Get date range from query params (default to last 30 days)
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all requests from the three separate tables
        const [documentRequests, idRequests, incidentReports] = await Promise.all([
            pool.query("SELECT *, 'Document Request' as type FROM document_requests WHERE created_at >= $1", [startDate]),
            pool.query("SELECT *, 'Create ID' as type FROM id_requests WHERE created_at >= $1", [startDate]),
            pool.query("SELECT *, 'Incident Report' as type FROM incident_reports WHERE created_at >= $1", [startDate])
        ]);

        // Combine all requests
        const requests = [
            ...documentRequests.rows,
            ...idRequests.rows,
            ...incidentReports.rows
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Calculate analytics
        const analytics = {
            totalRequests: requests.length,
            requestTypes: {
                'Document Request': documentRequests.rows.length,
                'Create ID': idRequests.rows.length,
                'Incident Report': incidentReports.rows.length
            },
            statusDistribution: {
                pending: requests.filter(r => r.status === 'pending').length,
                approved: requests.filter(r => r.status === 'approved').length,
                rejected: requests.filter(r => r.status === 'rejected').length
            },
            dailyTrends: {},
            monthlyTrends: {},
            averageProcessingTime: 0,
            peakHours: {},
            recentActivity: requests.slice(0, 10)
        };

        // Calculate daily trends
        const dailyData = {};
        requests.forEach(request => {
            const date = new Date(request.created_at).toDateString();
            dailyData[date] = (dailyData[date] || 0) + 1;
        });
        analytics.dailyTrends = dailyData;

        // Calculate peak hours
        const hourlyData = {};
        requests.forEach(request => {
            const hour = new Date(request.created_at).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        });
        analytics.peakHours = hourlyData;

        // Calculate average processing time (for completed requests)
        const completedRequests = requests.filter(r => r.status === 'approved' || r.status === 'rejected');
        if (completedRequests.length > 0) {
            const totalProcessingTime = completedRequests.reduce((total, request) => {
                const created = new Date(request.created_at);
                const updated = new Date(request.updated_at || request.created_at);
                return total + (updated - created);
            }, 0);
            analytics.averageProcessingTime = Math.round(totalProcessingTime / completedRequests.length / (1000 * 60 * 60)); // in hours
        }

        res.json({
            success: true,
            analytics,
            dateRange: {
                start: startDate,
                end: new Date(),
                days
            }
        });

    } catch (error) {
        console.error('❌ Analytics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch analytics data' 
        });
    }
});

// Get detailed analytics with filters
app.get('/api/analytics/detailed', generalLimiter, auditLog('Detailed Analytics'), async (req, res) => {
    try {
        const { startDate, endDate, type, status } = req.query;
        
        // Build queries for each table based on type filter
        let documentQuery = "SELECT *, 'Document Request' as type FROM document_requests WHERE 1=1";
        let idQuery = "SELECT *, 'Create ID' as type FROM id_requests WHERE 1=1";
        let incidentQuery = "SELECT *, 'Incident Report' as type FROM incident_reports WHERE 1=1";
        
        const params = [];
        let paramIndex = 1;

        // Add date filters
        if (startDate) {
            documentQuery += ` AND created_at >= $${paramIndex}`;
            idQuery += ` AND created_at >= $${paramIndex}`;
            incidentQuery += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            documentQuery += ` AND created_at <= $${paramIndex}`;
            idQuery += ` AND created_at <= $${paramIndex}`;
            incidentQuery += ` AND created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Add status filter
        if (status) {
            documentQuery += ` AND status = $${paramIndex}`;
            idQuery += ` AND status = $${paramIndex}`;
            incidentQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Execute queries based on type filter
        let requests = [];
        
        if (!type || type === 'Document Request') {
            const docResult = await pool.query(documentQuery + ' ORDER BY created_at DESC', params);
            requests.push(...docResult.rows);
        }
        
        if (!type || type === 'Create ID') {
            const idResult = await pool.query(idQuery + ' ORDER BY created_at DESC', params);
            requests.push(...idResult.rows);
        }
        
        if (!type || type === 'Incident Report') {
            const incidentResult = await pool.query(incidentQuery + ' ORDER BY created_at DESC', params);
            requests.push(...incidentResult.rows);
        }

        // Sort all requests by created_at
        requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Calculate detailed analytics
        const analytics = {
            totalRequests: requests.length,
            requestTypes: {},
            statusDistribution: {},
            dailyTrends: {},
            processingTimes: [],
            userActivity: {}
        };

        // Calculate distributions
        requests.forEach(request => {
            // Request types
            analytics.requestTypes[request.type] = (analytics.requestTypes[request.type] || 0) + 1;
            
            // Status distribution
            analytics.statusDistribution[request.status] = (analytics.statusDistribution[request.status] || 0) + 1;
            
            // Daily trends
            const date = new Date(request.created_at).toDateString();
            analytics.dailyTrends[date] = (analytics.dailyTrends[date] || 0) + 1;
            
            // Processing times
            if (request.status === 'approved' || request.status === 'rejected') {
                const created = new Date(request.created_at);
                const updated = new Date(request.updated_at || request.created_at);
                const processingTime = (updated - created) / (1000 * 60 * 60); // in hours
                analytics.processingTimes.push(processingTime);
            }
            
            // User activity (using clerk_id as user identifier)
            if (request.clerk_id) {
                analytics.userActivity[request.clerk_id] = (analytics.userActivity[request.clerk_id] || 0) + 1;
            }
        });

        res.json({
            success: true,
            analytics,
            filters: { startDate, endDate, type, status }
        });

    } catch (error) {
        console.error('❌ Detailed analytics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch detailed analytics' 
        });
    }
});

// Export analytics data
app.get('/api/analytics/export', generalLimiter, auditLog('Analytics Export'), async (req, res) => {
    try {
        const { format, startDate, endDate, type, status } = req.query;
        
        // Build queries for each table based on type filter
        let documentQuery = "SELECT *, 'Document Request' as type FROM document_requests WHERE 1=1";
        let idQuery = "SELECT *, 'Create ID' as type FROM id_requests WHERE 1=1";
        let incidentQuery = "SELECT *, 'Incident Report' as type FROM incident_reports WHERE 1=1";
        
        const params = [];
        let paramIndex = 1;

        // Add date filters
        if (startDate) {
            documentQuery += ` AND created_at >= $${paramIndex}`;
            idQuery += ` AND created_at >= $${paramIndex}`;
            incidentQuery += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            documentQuery += ` AND created_at <= $${paramIndex}`;
            idQuery += ` AND created_at <= $${paramIndex}`;
            incidentQuery += ` AND created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        // Add status filter
        if (status) {
            documentQuery += ` AND status = $${paramIndex}`;
            idQuery += ` AND status = $${paramIndex}`;
            incidentQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Execute queries based on type filter
        let requests = [];
        
        if (!type || type === 'Document Request') {
            const docResult = await pool.query(documentQuery + ' ORDER BY created_at DESC', params);
            requests.push(...docResult.rows);
        }
        
        if (!type || type === 'Create ID') {
            const idResult = await pool.query(idQuery + ' ORDER BY created_at DESC', params);
            requests.push(...idResult.rows);
        }
        
        if (!type || type === 'Incident Report') {
            const incidentResult = await pool.query(incidentQuery + ' ORDER BY created_at DESC', params);
            requests.push(...incidentResult.rows);
        }

        // Sort all requests by created_at
        requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (format === 'csv') {
            // Generate CSV
            const csvHeaders = ['ID', 'Type', 'Status', 'Clerk ID', 'Created At', 'Updated At', 'Details'];
            const csvData = requests.map(req => [
                req.id,
                req.type,
                req.status,
                req.clerk_id || '',
                new Date(req.created_at).toLocaleString(),
                req.updated_at ? new Date(req.updated_at).toLocaleString() : '',
                req.document_type || req.reason || req.description || req.title || ''
            ]);

            const csvContent = [csvHeaders, ...csvData]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvContent);

        } else if (format === 'json') {
            // Generate JSON
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.json"`);
            res.json({
                exportDate: new Date().toISOString(),
                filters: { startDate, endDate, type, status },
                data: requests
            });

        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Unsupported export format. Use "csv" or "json".' 
            });
        }

    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export analytics data' 
        });
    }
});

// ========== ACCOUNT MAINTENANCE (USERS) ENDPOINTS ========== //
console.log('👥 Setting up account maintenance endpoints...');

// List/search users with pagination and filters
app.get('/api/admin/users', generalLimiter, auditLog('List Users'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        const params = [];
        let where = 'WHERE 1=1';
        if (search) {
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            params.push(`%${search}%`);
            // Reserve a param for reference number search in id_requests
            params.push(`%${search}%`);
            const nameIdx = params.length - 3;
            const emailIdx = params.length - 2;
            const clerkIdx = params.length - 1;
            const refIdx = params.length;
            where += ` AND (name ILIKE $${nameIdx} OR email ILIKE $${emailIdx} OR clerk_id ILIKE $${clerkIdx} OR EXISTS (SELECT 1 FROM id_requests r WHERE r.clerk_id = users.clerk_id AND r.reference_number ILIKE $${refIdx}))`;
        }
        if (status) {
            params.push(status);
            where += ` AND status = $${params.length}`;
        }

        const countSql = `SELECT COUNT(*) FROM users ${where}`;
        const countRes = await pool.query(countSql, params);
        let total = parseInt(countRes.rows[0].count || '0');

        const dataSql = `SELECT id, name, email, contact, address, birth_date, status, clerk_id, created_at, updated_at
                         FROM users ${where}
                         ORDER BY created_at DESC
                         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const dataParams = [...params, limitNum, offset];
        let dataRows = (await pool.query(dataSql, dataParams)).rows;

        // If no direct users found but search is provided, try to infer users from id_requests
        if (dataRows.length === 0 && search) {
            const idReqs = await pool.query(
                `SELECT DISTINCT ON (clerk_id) clerk_id, full_name as name, contact, address, birth_date, created_at
                 FROM id_requests 
                 WHERE clerk_id ILIKE $1 OR full_name ILIKE $1 OR reference_number ILIKE $1
                 ORDER BY clerk_id, created_at DESC
                 LIMIT $2 OFFSET $3`,
                [`%${search}%`, limitNum, offset]
            );
            dataRows = idReqs.rows.map(r => ({
                id: null,
                name: r.name,
                email: null,
                contact: r.contact,
                address: r.address,
                birth_date: r.birth_date,
                status: 'pending',
                clerk_id: r.clerk_id,
                created_at: r.created_at,
                updated_at: null,
            }));
            total = dataRows.length; // best-effort
        }

        res.status(200).json({
            success: true,
            data: dataRows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.max(1, Math.ceil(total / limitNum))
            }
        });
    } catch (e) {
        console.error('❌ List users error:', e);
        res.status(500).json({ success: false, message: 'Failed to list users' });
    }
});

// Get full user profile including latest ID images if available
app.get('/api/admin/users/:id', generalLimiter, auditLog('Get User Detail'), async (req, res) => {
    try {
        const { id } = req.params;
        const userRes = await pool.query(
            `SELECT id, name, email, contact, address, birth_date, status, clerk_id, created_at, updated_at, selfie_image_url, id_image_url
             FROM users WHERE id = $1`,
            [id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user = userRes.rows[0];

        // Enrich with latest ID request data to fill missing profile fields
        const latestReqRes = await pool.query(
            `SELECT full_name, contact AS req_contact, address AS req_address, birth_date AS req_birth_date,
                    selfie_image_url AS req_selfie, id_image_url AS req_id_image, reference_number,
                    id_type, id_number, name_on_id, birthdate_on_id, address_on_id
             FROM id_requests
             WHERE clerk_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [user.clerk_id]
        );
        if (latestReqRes.rows.length > 0) {
            const r = latestReqRes.rows[0];
            // Prefer existing user fields; fallback to ID request values
            // For admin view: always prefer the full name from the latest ID request
            user.name = r.full_name || user.name;
            user.contact = user.contact || r.req_contact || user.contact;
            user.address = user.address || r.req_address || user.address;
            user.birth_date = user.birth_date || r.req_birth_date || user.birth_date;
            user.reference_number = r.reference_number || null;
            user.selfie_image_url = user.selfie_image_url || r.req_selfie || user.selfie_image_url;
            user.id_image_url = user.id_image_url || r.req_id_image || user.id_image_url;
            // Attach ID verification info as a nested object for the frontend
            user.id_verification = {
                id_type: r.id_type || null,
                id_number: r.id_number || null,
                name_on_id: r.name_on_id || null,
                birthdate_on_id: r.birthdate_on_id || null,
                address_on_id: r.address_on_id || null,
            };
        }

        // Normalize image URLs
        const toAbsolute = (val) => {
            if (!val) return val;
            if (typeof val !== 'string') return val;
            if (val.startsWith('http://') || val.startsWith('https://')) return val;
            const pathVal = val.startsWith('/') ? val : `/${val}`;
            return `${req.protocol}://${req.get('host')}${pathVal}`;
        };
        user.selfie_image_url = toAbsolute(user.selfie_image_url);
        user.id_image_url = toAbsolute(user.id_image_url);

        res.status(200).json({ success: true, data: user });
    } catch (e) {
        console.error('❌ Get user detail error:', e);
        res.status(500).json({ success: false, message: 'Failed to get user detail' });
    }
});

// Update user profile details (not images)
app.patch('/api/admin/users/:id', extractAdminInfo, auditLog('Update User'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, contact, address, birth_date, status } = req.body;

        const fields = [];
        const values = [];
        if (name !== undefined) { fields.push('name'); values.push(name); }
        if (email !== undefined) { fields.push('email'); values.push(email); }
        if (contact !== undefined) { fields.push('contact'); values.push(contact); }
        if (address !== undefined) { fields.push('address'); values.push(address); }
        if (birth_date !== undefined) { fields.push('birth_date'); values.push(birth_date); }
        if (status !== undefined) { fields.push('status'); values.push(status); }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        const setClause = fields.map((f, idx) => `${f} = $${idx + 1}`).join(', ') + ', updated_at = NOW()';
        const query = `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, name, email, contact, address, birth_date, status, clerk_id, created_at, updated_at`;
        const result = await pool.query(query, [...values, id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('❌ Update user error:', e);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// Approve/Reject/Enable/Disable user account
app.post('/api/admin/users/:id/action', extractAdminInfo, auditLog('User Account Action'), async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const valid = ['approve', 'reject', 'enable', 'disable'];
        if (!valid.includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

        let newStatus = null;
        if (action === 'approve') newStatus = 'active';
        if (action === 'reject') newStatus = 'disabled';
        if (action === 'enable') newStatus = 'active';
        if (action === 'disable') newStatus = 'disabled';

        const result = await pool.query(
            `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, contact, address, birth_date, status, clerk_id, created_at, updated_at`,
            [newStatus, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('❌ User action error:', e);
        res.status(500).json({ success: false, message: 'Failed to perform action' });
    }
});

// ========== NOTIFICATION FUNCTIONS ========== //
async function sendPushNotification(userId, title, body, data) {
    console.log('🔔 Sending push notification:', { userId, title, body });
    try {
        const result = await pool.query(
            'SELECT push_token FROM user_push_tokens WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0 || !result.rows[0].push_token) {
            console.log(`❌ No push token registered for user: ${userId}`);
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
        console.log('✅ Notification sent successfully:', ticket);
        return { sent: true, ticket };
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        return { sent: false, error: error.message };
    }
}

// ========== NOTIFICATION ENDPOINT ========== //
console.log('🔔 Setting up notification endpoints...');

app.post('/api/save-push-token', async (req, res) => {
    const { userId, pushToken } = req.body;
    console.log('🔔 Saving push token for user:', userId);

    if (!userId || !pushToken) {
        return res.status(400).json({ error: "Missing userId or pushToken" });
    }

    try {
        await pool.query(
            'INSERT INTO user_push_tokens (user_id, push_token) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET push_token = $2, updated_at = NOW()',
            [userId, pushToken]
        );
        console.log('✅ Push token saved successfully for user:', userId);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ Error saving push token:', error);
        res.status(500).json({ error: 'Failed to save push token' });
    }
});

// ========== USER CREATION/UPSERT (from mobile after Clerk signup) ==========
app.post('/api/users', async (req, res) => {
    const { name, clerkId, phonenumber, email } = req.body || {};
    if (!clerkId || !name) {
        return res.status(400).json({ success: false, message: 'Missing required fields: name, clerkId' });
    }
    try {
        // Upsert by clerk_id, prefer provided phone/email if present
        const result = await pool.query(
            `INSERT INTO users (name, clerk_id, phonenumber, email, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (clerk_id)
             DO UPDATE SET name = EXCLUDED.name,
                           phonenumber = COALESCE(EXCLUDED.phonenumber, users.phonenumber),
                           email = COALESCE(EXCLUDED.email, users.email),
                           updated_at = NOW()
             RETURNING id, name, clerk_id, phonenumber, email`,
            [name, clerkId, phonenumber || null, email || null]
        );
        return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('❌ Error upserting user:', error);
        return res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// ========== ANNOUNCEMENTS ENDPOINTS ========== //
console.log('📢 Setting up announcements endpoints...');

app.get('/api/announcements', async (req, res) => {
    console.log('📢 Fetching all announcements...');
    try {
        const announcements = await pool.query(
            `SELECT a.*,
                    (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = a.id) as comment_count,
                    (SELECT COUNT(*) FROM announcement_reactions WHERE announcement_id = a.id) as reaction_count
             FROM announcements a
             WHERE a.expires_at IS NULL OR a.expires_at > NOW()
             ORDER BY a.created_at DESC`
        );
        console.log(`✅ Fetched ${announcements.rows.length} announcements`);
        res.status(200).json(announcements.rows);
    } catch (error) {
        console.error('❌ Error fetching announcements:', error);
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

app.post('/api/announcements', upload.single('media'), auditLog('Create Announcement'), async (req, res) => {
    console.log('Received announcement post request');
    const { title, content, priority, expires_in_days, expires_at } = req.body;
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
        // Determine expiry date if provided
        let expiry = null;
        if (expires_at) {
            expiry = new Date(expires_at);
        } else if (expires_in_days) {
            const days = parseInt(expires_in_days);
            if (!isNaN(days) && days > 0) {
                expiry = new Date();
                expiry.setDate(expiry.getDate() + days);
            }
        }

        const result = await pool.query(
            `INSERT INTO announcements
                 (title, content, priority, media_url, created_at, expires_at)
             VALUES ($1, $2, $3, $4, NOW(), $5)
                 RETURNING *`,
            [title, content, priority, mediaUrl, expiry]
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

app.delete('/api/announcements/:id', auditLog('Delete Announcement'), async (req, res) => {
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
// Accept multiple possible file fields across request types
app.post("/api/requests", upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'id_image', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 },
    { name: 'bill_image', maxCount: 1 }, // Meralco bill
]), async (req, res) => {
    const { type, document_type, reason, clerk_id, full_name, birth_date, address, contact, description, title, location, sex, civil_status } = req.body;
    const files = req.files || {};
    const mediaFile = files.media && files.media[0] ? files.media[0] : null;
    const idImageFile = files.id_image && files.id_image[0] ? files.id_image[0] : null;
    const selfieImageFile = files.selfie_image && files.selfie_image[0] ? files.selfie_image[0] : null;

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
                console.log('[id-request] Create ID received for', clerk_id, 'at', timestamp);
                if (!full_name || !birth_date || !address || !contact || !clerk_id) {
                    return res.status(400).json({ error: "Missing fields for Create ID" });
                }

                const idImageUrl = idImageFile ? `/uploads/${idImageFile.filename}` : (req.body.id_image_url || null);
                const selfieImageUrl = selfieImageFile ? `/uploads/${selfieImageFile.filename}` : (req.body.selfie_image_url || null);
                const billImageFile = files.bill_image && files.bill_image[0] ? files.bill_image[0] : null;
                const billImageUrl = billImageFile ? `/uploads/${billImageFile.filename}` : (req.body.bill_image_url || null);
                console.log('[id-request] billImageFile?', !!billImageFile, 'billImageUrl=', billImageUrl);

                // Enforce presence of both images; block submission if either is missing
                if (!idImageUrl || !selfieImageUrl) {
                    return res.status(400).json({
                        error: "ID image and selfie image are required",
                        missing: {
                            id_image_url: !idImageUrl,
                            selfie_image_url: !selfieImageUrl
                        }
                    });
                }

                await refreshIdImageColumnsFlag();

                // Always insert the base row first
                const baseInsert = await pool.query(
                    "INSERT INTO id_requests(full_name, birth_date, address, contact, clerk_id, sex, civil_status, created_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
                    [full_name, birth_date, address, contact, clerk_id, sex || null, civil_status || null, timestamp]
                );
                const inserted = baseInsert.rows[0];

                // If columns exist, immediately set the image URLs
                if (hasIdImageColumns) {
                    await pool.query(
                        "UPDATE id_requests SET id_image_url = $1, selfie_image_url = $2, bill_image_url = $3 WHERE id = $4",
                        [idImageUrl, selfieImageUrl, billImageUrl, inserted.id]
                    );
                }

                // Analyze Meralco bill image via model API (best-effort, do not fail request)
                try {
                    let analysis = null;
                    if (billImageFile) {
                        const localPath = path.join(__dirname, 'public', 'uploads', billImageFile.filename);
                        analysis = await analyzeLocalFileWithModel(localPath);
                    } else if (billImageUrl) {
                        // If absolute URL → fetch remotely; if local /uploads path → read from disk
                        if (typeof billImageUrl === 'string' && /^https?:\/\//i.test(billImageUrl)) {
                            analysis = await analyzeRemoteUrlWithModel(billImageUrl);
                        } else {
                            const rel = typeof billImageUrl === 'string' && billImageUrl.startsWith('/') ? billImageUrl : `/${billImageUrl}`;
                            const localPath = path.join(__dirname, 'public', rel);
                            analysis = await analyzeLocalFileWithModel(localPath);
                        }
                    }
                    if (analysis) {
                        console.log('[bill-analysis] result prob=', analysis.prob, 'threshold=', analysis.threshold);
                        await pool.query(
                            "UPDATE id_requests SET bill_prob_tampered = $1, bill_pred_label = $2, bill_threshold_used = $3 WHERE id = $4",
                            [analysis.prob, analysis.label, analysis.threshold, inserted.id]
                        );
                    } else {
                        console.log('[bill-analysis] no analysis result');
                    }
                } catch (e) {
                    console.warn('Bill analysis failed:', e?.message || e);
                }

                const updated = await pool.query('SELECT * FROM id_requests WHERE id = $1', [inserted.id]);
                return res.status(200).json(updated.rows[0]);

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
    console.log('📋 Fetching all requests (documents, IDs, incidents)...');
    try {
        const [documentRequests, idRequests, incidentReports] = await Promise.all([
            pool.query("SELECT *, 'Document Request' as type FROM document_requests"),
            pool.query("SELECT *, 'Create ID' as type FROM id_requests"),
            pool.query("SELECT *, 'Incident Report' as type FROM incident_reports")
        ]);

        // Normalize image URLs for ID requests to absolute URLs for reliable display
        const toAbsolute = (val) => {
            if (!val) return val;
            if (typeof val !== 'string') return val;
            if (val.startsWith('http://') || val.startsWith('https://')) return val;
            const pathVal = val.startsWith('/') ? val : `/${val}`;
            return `${req.protocol}://${req.get('host')}${pathVal}`;
        };
        const idRequestsNormalized = idRequests.rows.map(row => ({
            ...row,
            id_image_url: toAbsolute(row.id_image_url),
            selfie_image_url: toAbsolute(row.selfie_image_url),
        }));

        const totalRequests = documentRequests.rows.length + idRequestsNormalized.length + incidentReports.rows.length;
        console.log(`✅ Fetched ${totalRequests} total requests:`, {
            documents: documentRequests.rows.length,
            ids: idRequestsNormalized.length,
            incidents: incidentReports.rows.length
        });

        res.status(200).json([
            ...documentRequests.rows,
            ...idRequestsNormalized,
            ...incidentReports.rows
        ]);
    } catch (error) {
        console.error("❌ Error fetching requests:", error);
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

        const toAbsolute = (val) => {
            if (!val) return val;
            if (typeof val !== 'string') return val;
            if (val.startsWith('http://') || val.startsWith('https://')) return val;
            const pathVal = val.startsWith('/') ? val : `/${val}`;
            return `${req.protocol}://${req.get('host')}${pathVal}`;
        };
        const idsNormalized = ids.rows.map(row => ({
            ...row,
            id_image_url: toAbsolute(row.id_image_url),
            selfie_image_url: toAbsolute(row.selfie_image_url),
        }));

        res.status(200).json([
            ...documents.rows,
            ...idsNormalized,
            ...incidents.rows
        ]);
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: "Error fetching requests from database" });
    }
});

// Latest ID request for a user (for gating Create ID flow)
app.get('/api/id-requests/:clerkID/latest', async (req, res) => {
    const { clerkID } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM id_requests WHERE clerk_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [clerkID]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No ID requests found' });
        }
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching latest ID request:', error);
        return res.status(500).json({ error: 'Failed to fetch latest ID request' });
    }
});

// Manually generate/re-generate ID card PNG for a specific ID request
app.post('/api/id-requests/:id/generate-id-card', async (req, res) => {
    const { id } = req.params;
    try {
        const latest = await pool.query('SELECT * FROM id_requests WHERE id = $1', [id]);
        if (latest.rows.length === 0) return res.status(404).json({ error: 'ID request not found' });
        const row = latest.rows[0];
        if (row.status !== 'approved') return res.status(400).json({ error: 'ID request must be approved' });
        const idCardUrl = await generateIdCardImage({
            id: row.id,
            fullName: row.full_name,
            birthDate: row.birth_date,
            address: row.address,
            referenceNumber: row.reference_number || String(row.id),
            selfieUrl: row.selfie_image_url || null,
            sex: row.sex || '',
            civilStatus: row.civil_status || '',
        });
        if (!idCardUrl) return res.status(500).json({ error: 'Failed to generate ID card image' });
        await pool.query('UPDATE id_requests SET id_card_url = $1, id_card_generated_at = NOW() WHERE id = $2', [idCardUrl, row.id]);
        const updated = await pool.query('SELECT * FROM id_requests WHERE id = $1', [row.id]);
        return res.status(200).json(updated.rows[0]);
    } catch (e) {
        console.error('Manual ID card generation error:', e);
        return res.status(500).json({ error: 'Internal error generating ID card' });
    }
});

// Dev convenience: allow GET to trigger generation during development
if ((process.env.NODE_ENV || 'development') !== 'production') {
    app.get('/api/id-requests/:id/generate-id-card', async (req, res) => {
        const { id } = req.params;
        try {
            const latest = await pool.query('SELECT * FROM id_requests WHERE id = $1', [id]);
            if (latest.rows.length === 0) return res.status(404).json({ error: 'ID request not found' });
            const row = latest.rows[0];
            if (row.status !== 'approved') return res.status(400).json({ error: 'ID request must be approved' });
            const idCardUrl = await generateIdCardImage({
                id: row.id,
                fullName: row.full_name,
                birthDate: row.birth_date,
                address: row.address,
                referenceNumber: row.reference_number || String(row.id),
                selfieUrl: row.selfie_image_url || null,
                sex: row.sex || '',
                civilStatus: row.civil_status || '',
            });
            if (!idCardUrl) return res.status(500).json({ error: 'Failed to generate ID card image' });
            await pool.query('UPDATE id_requests SET id_card_url = $1, id_card_generated_at = NOW() WHERE id = $2', [idCardUrl, row.id]);
            const updated = await pool.query('SELECT * FROM id_requests WHERE id = $1', [row.id]);
            return res.status(200).json(updated.rows[0]);
        } catch (e) {
            console.error('Manual ID card generation (GET) error:', e);
            return res.status(500).json({ error: 'Internal error generating ID card' });
        }
    });
}

app.patch('/api/incidents/:id', extractAdminInfo, auditLog('Update Incident Report'), async (req, res) => {
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

app.patch('/api/document-requests/:id', extractAdminInfo, auditLog('Update Document Request'), async (req, res) => {
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

app.patch('/api/id-requests/:id', extractAdminInfo, auditLog('Update ID Request'), async (req, res) => {
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

        // If approved, generate ID card image (best effort, non-blocking for response)
        if (status === 'approved') {
            (async () => {
                try {
                    const latest = await pool.query('SELECT * FROM id_requests WHERE id = $1', [id]);
                    if (latest.rows.length === 0) return;
                    const row = latest.rows[0];
                    const idCardUrl = await generateIdCardImage({
                        id: row.id,
                        fullName: row.full_name,
                        birthDate: row.birth_date,
                        address: row.address,
                        referenceNumber: row.reference_number || String(row.id),
                        selfieUrl: row.selfie_image_url || null,
                        sex: row.sex || '',
                        civilStatus: row.civil_status || '',
                    });
                    if (idCardUrl) {
                        await pool.query('UPDATE id_requests SET id_card_url = $1, id_card_generated_at = NOW() WHERE id = $2', [idCardUrl, row.id]);
                    }
                } catch (e) {
                    console.error('ID card generation failed:', e);
                }
            })();
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating ID request:", error);
        res.status(500).json({ error: "Error updating ID request status" });
    }
});

async function generateIdCardImage({ id, fullName, birthDate, address, referenceNumber, selfieUrl, sex, civilStatus, signatureUrl }) {
    try {
        const templatePath = path.join(__dirname, 'public', 'templates', 'id_template.png');
        if (!fs.existsSync(templatePath)) {
            console.warn('ID template missing at', templatePath);
            return null;
        }

        // Load selfie if available; if missing, skip photo
        let selfieProcessed = null;
        if (selfieUrl) {
            // Helper to safely resolve paths inside backend/public even if input starts with '/'
            const toPublicPath = (p) => {
                const clean = typeof p === 'string' && (p.startsWith('/') || p.startsWith('\\')) ? p.slice(1) : p;
                return path.join(__dirname, 'public', clean);
            };
            let selfieBuf;
            try {
                // Prefer local filesystem if URL points to our /uploads directory
                if (typeof selfieUrl === 'string' && selfieUrl.startsWith('http')) {
                    try {
                        const urlObj = new URL(selfieUrl);
                        if (urlObj.pathname && urlObj.pathname.startsWith('/uploads/')) {
                            const localPath = toPublicPath(urlObj.pathname);
                            if (fs.existsSync(localPath)) {
                                selfieBuf = fs.readFileSync(localPath);
                            }
                        }
                    } catch {}
                }
                // Fallback to relative path under public
                if (!selfieBuf && typeof selfieUrl === 'string' && (selfieUrl.startsWith('/') || selfieUrl.startsWith('\\'))) {
                    const localPath = toPublicPath(selfieUrl);
                    if (fs.existsSync(localPath)) {
                        selfieBuf = fs.readFileSync(localPath);
                    }
                }
                // Last resort, try HTTP fetch only if available in this Node runtime
                if (!selfieBuf && typeof selfieUrl === 'string' && selfieUrl.startsWith('http') && typeof fetch === 'function') {
                    const r = await fetch(selfieUrl);
                    selfieBuf = Buffer.from(await r.arrayBuffer());
                }
            } catch {}
            if (selfieBuf) {
                // Auto-rotate using EXIF, resize to fit photo box, rectangular (no mask)
                selfieProcessed = await sharp(selfieBuf)
                    .rotate(-90)
                    .resize(300, 300, { fit: 'cover', position: 'centre' })
                    .png()
                    .toBuffer();
            }
        }

        // Read template size and scale placements to fit any template dimensions
        const meta = await sharp(templatePath).metadata();
        const baseW = meta.width || 1012;
        const baseH = meta.height || 638;
        const sx = baseW / 1012;
        const sy = baseH / 638;
        const pxX = (v) => Math.round(v * sx);
        const pxY = (v) => Math.round(v * sy);
        const fontName = Math.max(18, Math.round(28 * sx));
        const fontValue = Math.max(10, Math.round(18 * sx));

        // Format birth date as YYYY-MM-DD (local time components)
        const toYMD = (val) => {
            try {
                const d = new Date(val);
                if (isNaN(d.getTime())) return '';
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${da}`;
            } catch { return ''; }
        };
        const birthDateText = toYMD(birthDate || '');

        const qrRaw = await QRCode.toBuffer(referenceNumber || String(id), { margin: 0, scale: 8 });
        const qrSize = Math.min(pxX(180), baseW); // ensure it fits base
        const qrBuf = await sharp(qrRaw).resize(qrSize, qrSize).png().toBuffer();
        const qrLeft = Math.max(0, Math.min(pxX(820), baseW - qrSize));
        const qrTop = Math.max(0, Math.min(pxY(420), baseH - qrSize));

        // Address wrapping to avoid the QR area
        const addressX = pxX(330);
        // Place address text above the underline; allow up to two lines
        const addressY = pxY(500);
        const rightPadding = pxX(20);
        const maxAddressWidth = Math.max(0, qrLeft - rightPadding - addressX);
        const approxCharWidth = Math.max(6, Math.round(fontValue * 0.6));
        const maxCharsPerLine = Math.max(8, Math.floor(maxAddressWidth / approxCharWidth));
        const lineHeight = Math.round(fontValue * 1.2);
        const wrapAddress = (text, maxChars) => {
            const words = String(text || '').split(/\s+/);
            const lines = [];
            let current = '';
            for (const w of words) {
                const candidate = current ? current + ' ' + w : w;
                if (candidate.length <= maxChars) {
                    current = candidate;
                } else {
                    if (current) lines.push(current);
                    current = w;
                }
            }
            if (current) lines.push(current);
            return lines.slice(0, 2); // up to two lines above the address underline
        };
        const addressLines = wrapAddress(address, maxCharsPerLine);
        const addressSvg = addressLines
            .map((line, idx) => `<text x="${addressX}" y="${addressY + idx * lineHeight}" class="value">${escapeXml(line)}</text>`)
            .join('');

        // Only values: template already has labels and lines
        const svg = Buffer.from(`
        <svg width="${baseW}" height="${baseH}" viewBox="0 0 ${baseW} ${baseH}" xmlns="http://www.w3.org/2000/svg">
          <style>
            .name { font-family: Arial, sans-serif; font-weight: 700; font-size: ${fontName}px; fill: #0f172a; }
            .value { font-family: Arial, sans-serif; font-weight: 600; font-size: ${fontValue}px; fill: #111827; }
          </style>
          <!-- Resident Full Name line -->
          <text x="${pxX(330)}" y="${pxY(270)}" class="name">${escapeXml(fullName || '')}</text>
          <!-- Birth Date | Sex | Civil Status values on their lines -->
          <text x="${pxX(330)}" y="${pxY(348)}" class="value">${escapeXml(birthDateText)}</text>
          <text x="${pxX(540)}" y="${pxY(340)}" class="value">${escapeXml(sex || '')}</text>
          <text x="${pxX(740)}" y="${pxY(340)}" class="value">${escapeXml(civilStatus || '')}</text>
          <!-- Address value lines (wrapped before QR) -->
          ${addressSvg}
          <!-- Reference number even lower and slightly left -->
          <text x="${pxX(110)}" y="${pxY(580)}" class="value">${escapeXml(referenceNumber || String(id))}</text>
        </svg>
        `);

        const outDir = path.join(__dirname, 'public', 'uploads', 'id-cards');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const outPath = path.join(outDir, `${id}.png`);

        // Build composite layers with graceful degradation
        const baseLayers = [{ input: svg, left: 0, top: 0 }];
        const layersWithQr = [...baseLayers, { input: qrBuf, left: qrLeft, top: qrTop }];
        const selfieWidth = Math.min(pxX(220), baseW);
        const selfieHeight = Math.min(pxY(220), baseH);
        const selfieLeft = pxX(70);
        const selfieTop = pxY(210);
        const selfieLayer = selfieProcessed ? await sharp(selfieProcessed).resize(selfieWidth, selfieHeight, { fit: 'cover' }).png().toBuffer() : null;
        const layersWithSelfie = selfieLayer ? [{ input: selfieLayer, left: selfieLeft, top: selfieTop }, ...layersWithQr] : layersWithQr;

        // Optional signature image placement (left area under photo). If not provided, nothing is drawn.
        let finalLayers = layersWithSelfie;
        if (signatureUrl) {
            const toPublicPath = (p) => {
                const clean = typeof p === 'string' && (p.startsWith('/') || p.startsWith('\\')) ? p.slice(1) : p;
                return path.join(__dirname, 'public', clean);
            };
            try {
                const absSig = signatureUrl.startsWith('http') ? signatureUrl : toPublicPath(signatureUrl);
                let sigBuf;
                if (absSig.startsWith('http') && typeof fetch === 'function') {
                    const rs = await fetch(absSig);
                    sigBuf = Buffer.from(await rs.arrayBuffer());
                } else if (fs.existsSync(absSig)) {
                    sigBuf = fs.readFileSync(absSig);
                }
                if (sigBuf) {
                    const sigResized = await sharp(sigBuf).resize(220, 60, { fit: 'inside' }).png().toBuffer();
                    finalLayers = [...finalLayers, { input: sigResized, left: 112, top: 500 }];
                }
            } catch (e) {
                console.warn('Signature overlay skipped:', e?.message || e);
            }
        }

        // Try full, then step-down fallbacks
        try {
            await sharp(templatePath).composite(finalLayers).png().toFile(outPath);
        } catch (e1) {
            console.warn('Composite with all layers failed, retrying without selfie/signature:', e1?.message || e1);
            try {
                await sharp(templatePath).composite(layersWithQr).png().toFile(outPath);
            } catch (e2) {
                console.warn('Composite without selfie failed, retrying without QR:', e2?.message || e2);
                try {
                    await sharp(templatePath).composite(baseLayers).png().toFile(outPath);
                } catch (e3) {
                    console.warn('Composite with SVG only failed, copying template:', e3?.message || e3);
                    fs.copyFileSync(templatePath, outPath);
                }
            }
        }

        return `/uploads/id-cards/${id}.png`;
    } catch (e) {
        console.error('generateIdCardImage error:', e);
        return null;
    }
}

function escapeXml(s = '') {
    const str = (s === null || s === undefined) ? '' : String(s);
    return str.replace(/[<>&'\"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]));
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    console.error('📋 Request details:', {
        method: req.method,
        url: req.url,
        body: req.body,
        params: req.params,
        query: req.query,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Basic health and root routes for platform checks
app.get('/', (req, res) => {
    res.status(200).send('BrgyExpress API is running');
});

app.get('/health', async (req, res) => {
    try {
        // simple DB check
        const now = await pool.query('SELECT NOW()');
        res.status(200).json({ status: 'ok', time: now.rows[0].now });
    } catch (e) {
        res.status(500).json({ status: 'db_error' });
    }
});

// 404 handler
app.use((req, res) => {
    console.log('❌ 404 Not Found:', req.method, req.originalUrl);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log('🎉 ========================================');
    console.log('🎉 BrgyExpress Backend Server Started!');
    console.log('🎉 ========================================');
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/api/admin/login`);
    console.log('🛡️ Security Features: Rate limiting, Input validation, Session management');
    console.log('📱 Mobile API: Ready for mobile app requests');
    console.log('🔔 Push Notifications: Expo SDK configured');
    console.log('🗄️ Database: PostgreSQL connected');
    console.log('🎉 ========================================');
    console.log('📝 Server logs will appear below:');
    console.log('🎉 ========================================');
});