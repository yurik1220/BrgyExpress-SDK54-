const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const { Expo } = require('expo-server-sdk');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
require("dotenv").config();

const app = express();
const PORT = 5000;
const expo = new Expo();

// Log server startup
console.log('🚀 Starting BrgyExpress Backend Server...');
console.log(`📡 Server will run on port ${PORT}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

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

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully');
        console.log(`🗄️ Database timestamp: ${res.rows[0].now}`);
    }
});

// Note: audit_logs table should be created externally using the SQL script
console.log('📋 Audit logging system ready (table must exist in database)');

// Admin Authentication Middleware
const extractAdminInfo = async (req, res, next) => {
    try {
        // Try to get admin info from Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // Decode the simple token (in production, use JWT)
            try {
                const decoded = Buffer.from(token, 'base64').toString();
                const [adminId] = decoded.split(':');
                if (adminId) {
                    // Get admin details from database
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
            req.adminInfo.username = req.body.admin_username;
        }
        
        next();
    } catch (error) {
        console.error('❌ Error extracting admin info:', error);
        next();
    }
};

// Audit Log Middleware
const auditLog = (action) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log after response is sent
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
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

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
app.use('/uploads', express.static(path.join(__dirname, "public/uploads")));
app.use(generalLimiter);

console.log('🔧 Middleware configured: CORS, JSON parsing, static files, rate limiting');

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
    console.log('📋 Fetching all requests (documents, IDs, incidents)...');
    try {
        const [documentRequests, idRequests, incidentReports] = await Promise.all([
            pool.query("SELECT *, 'Document Request' as type FROM document_requests"),
            pool.query("SELECT *, 'Create ID' as type FROM id_requests"),
            pool.query("SELECT *, 'Incident Report' as type FROM incident_reports")
        ]);

        const totalRequests = documentRequests.rows.length + idRequests.rows.length + incidentReports.rows.length;
        console.log(`✅ Fetched ${totalRequests} total requests:`, {
            documents: documentRequests.rows.length,
            ids: idRequests.rows.length,
            incidents: incidentReports.rows.length
        });

        res.status(200).json([
            ...documentRequests.rows,
            ...idRequests.rows,
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

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating ID request:", error);
        res.status(500).json({ error: "Error updating ID request status" });
    }
});

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
    console.log(`📊 Health Check: http://localhost:${PORT}/api/requests`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/api/admin/login`);
    console.log('🛡️ Security Features: Rate limiting, Input validation, Session management');
    console.log('📱 Mobile API: Ready for mobile app requests');
    console.log('🔔 Push Notifications: Expo SDK configured');
    console.log('🗄️ Database: PostgreSQL connected');
    console.log('🎉 ========================================');
    console.log('📝 Server logs will appear below:');
    console.log('🎉 ========================================');
});