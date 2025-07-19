-- =====================================================
-- AUDIT LOGS SETUP & CHEAT SHEET FOR BRGYEXPRESS
-- =====================================================

-- =====================================================
-- STEP 1: CREATE THE AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    admin_username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_username ON audit_logs(admin_username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

-- =====================================================
-- STEP 2: BASIC DATA RETRIEVAL QUERIES
-- =====================================================

-- Get all audit logs (most recent first)
SELECT * FROM audit_logs ORDER BY timestamp DESC;

-- Get latest 50 audit logs
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50;

-- Get audit logs for today
SELECT * FROM audit_logs 
WHERE DATE(timestamp) = CURRENT_DATE 
ORDER BY timestamp DESC;

-- Get audit logs for this week
SELECT * FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days' 
ORDER BY timestamp DESC;

-- Get audit logs for this month
SELECT * FROM audit_logs 
WHERE timestamp >= DATE_TRUNC('month', CURRENT_DATE) 
ORDER BY timestamp DESC;

-- =====================================================
-- STEP 3: FILTERING QUERIES
-- =====================================================

-- Get logs by specific admin
SELECT * FROM audit_logs 
WHERE admin_username = 'your_admin_username' 
ORDER BY timestamp DESC;

-- Get logs by action type
SELECT * FROM audit_logs 
WHERE action = 'Admin Login' 
ORDER BY timestamp DESC;

-- Get logs by IP address
SELECT * FROM audit_logs 
WHERE ip_address = '192.168.1.100' 
ORDER BY timestamp DESC;

-- Get logs within date range
SELECT * FROM audit_logs 
WHERE timestamp >= '2024-01-01' AND timestamp <= '2024-12-31' 
ORDER BY timestamp DESC;

-- Get logs with multiple filters
SELECT * FROM audit_logs 
WHERE admin_username = 'admin' 
  AND action = 'Admin Login' 
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- =====================================================
-- STEP 4: STATISTICS & ANALYTICS QUERIES
-- =====================================================

-- Count total audit logs
SELECT COUNT(*) as total_logs FROM audit_logs;

-- Count logs by action type
SELECT action, COUNT(*) as count 
FROM audit_logs 
GROUP BY action 
ORDER BY count DESC;

-- Count logs by admin
SELECT admin_username, COUNT(*) as action_count 
FROM audit_logs 
WHERE admin_username IS NOT NULL 
GROUP BY admin_username 
ORDER BY action_count DESC;

-- Count logs by IP address
SELECT ip_address, COUNT(*) as request_count 
FROM audit_logs 
GROUP BY ip_address 
ORDER BY request_count DESC;

-- Daily activity summary
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_actions,
    COUNT(DISTINCT admin_username) as unique_admins,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs 
GROUP BY DATE(timestamp) 
ORDER BY date DESC;

-- Hourly activity pattern
SELECT 
    EXTRACT(HOUR FROM timestamp) as hour,
    COUNT(*) as action_count
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM timestamp) 
ORDER BY hour;

-- =====================================================
-- STEP 5: SECURITY MONITORING QUERIES
-- =====================================================

-- Failed login attempts (assuming 401 status in details)
SELECT admin_username, ip_address, COUNT(*) as failed_attempts 
FROM audit_logs 
WHERE action = 'Admin Login' 
  AND details LIKE '%"responseSuccess":false%'
  AND timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY admin_username, ip_address 
HAVING COUNT(*) > 3;

-- Suspicious IP activity (high request count)
SELECT ip_address, COUNT(*) as request_count 
FROM audit_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address 
HAVING COUNT(*) > 100;

-- Unusual admin activity (high action count)
SELECT admin_username, action, COUNT(*) as action_count 
FROM audit_logs 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY admin_username, action 
HAVING COUNT(*) > 50;

-- Login attempts from new IPs
SELECT DISTINCT admin_username, ip_address 
FROM audit_logs 
WHERE action = 'Admin Login' 
  AND ip_address NOT IN (
    SELECT DISTINCT ip_address 
    FROM audit_logs 
    WHERE action = 'Admin Login' 
      AND timestamp < NOW() - INTERVAL '7 days'
  );

-- =====================================================
-- STEP 6: DATA EXPORT QUERIES
-- =====================================================

-- Export all audit logs to CSV (PostgreSQL)
COPY (
    SELECT 
        timestamp,
        admin_username,
        action,
        ip_address,
        details
    FROM audit_logs 
    ORDER BY timestamp DESC
) TO '/path/to/audit_logs_export.csv' WITH CSV HEADER;

-- Export recent logs for analysis
SELECT 
    timestamp,
    admin_username,
    action,
    ip_address,
    SUBSTRING(details, 1, 200) as details_preview
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY timestamp DESC;

-- Export security report
SELECT 
    admin_username,
    action,
    ip_address,
    timestamp,
    CASE 
        WHEN details LIKE '%"responseSuccess":false%' THEN 'FAILED'
        ELSE 'SUCCESS'
    END as status
FROM audit_logs 
WHERE action IN ('Admin Login', 'Admin Registration')
  AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- =====================================================
-- STEP 7: MAINTENANCE QUERIES
-- =====================================================

-- Delete old audit logs (keep last 6 months)
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '6 months';

-- Archive old logs to separate table
CREATE TABLE IF NOT EXISTS audit_logs_archive AS 
SELECT * FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '6 months';

-- Check table size and performance
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename = 'audit_logs';

-- Analyze table for better performance
ANALYZE audit_logs;

-- Vacuum table to reclaim storage
VACUUM audit_logs;

-- =====================================================
-- STEP 8: ADVANCED ANALYTICS QUERIES
-- =====================================================

-- Most active time periods
SELECT 
    EXTRACT(DOW FROM timestamp) as day_of_week,
    EXTRACT(HOUR FROM timestamp) as hour,
    COUNT(*) as activity_count
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(DOW FROM timestamp), EXTRACT(HOUR FROM timestamp)
ORDER BY activity_count DESC;

-- Admin session analysis
SELECT 
    admin_username,
    DATE(timestamp) as session_date,
    COUNT(*) as actions,
    MIN(timestamp) as first_action,
    MAX(timestamp) as last_action,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/3600 as session_hours
FROM audit_logs 
WHERE admin_username IS NOT NULL
GROUP BY admin_username, DATE(timestamp)
ORDER BY session_date DESC, actions DESC;

-- Action sequence analysis
SELECT 
    admin_username,
    action,
    LAG(action) OVER (PARTITION BY admin_username ORDER BY timestamp) as previous_action,
    timestamp
FROM audit_logs 
WHERE admin_username IS NOT NULL
ORDER BY admin_username, timestamp;

-- =====================================================
-- STEP 9: TROUBLESHOOTING QUERIES
-- =====================================================

-- Check for missing admin usernames
SELECT COUNT(*) as missing_usernames 
FROM audit_logs 
WHERE admin_username IS NULL OR admin_username = 'unknown';

-- Check for malformed details
SELECT id, details 
FROM audit_logs 
WHERE details IS NULL OR details = '';

-- Check for duplicate entries
SELECT admin_username, action, ip_address, timestamp, COUNT(*) 
FROM audit_logs 
GROUP BY admin_username, action, ip_address, timestamp 
HAVING COUNT(*) > 1;

-- Check table growth rate
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as daily_logs,
    SUM(COUNT(*)) OVER (ORDER BY DATE(timestamp)) as cumulative_logs
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- =====================================================
-- STEP 10: USEFUL VIEWS FOR FREQUENT QUERIES
-- =====================================================

-- Create view for recent activity
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
    timestamp,
    admin_username,
    action,
    ip_address,
    CASE 
        WHEN details LIKE '%"responseSuccess":true%' THEN 'SUCCESS'
        WHEN details LIKE '%"responseSuccess":false%' THEN 'FAILED'
        ELSE 'UNKNOWN'
    END as status
FROM audit_logs 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- Create view for security alerts
CREATE OR REPLACE VIEW security_alerts AS
SELECT 
    admin_username,
    ip_address,
    action,
    timestamp,
    COUNT(*) OVER (PARTITION BY admin_username, ip_address, action) as attempt_count
FROM audit_logs 
WHERE action = 'Admin Login' 
  AND details LIKE '%"responseSuccess":false%'
  AND timestamp >= NOW() - INTERVAL '1 hour';

-- =====================================================
-- NOTES & TIPS
-- =====================================================
/*
COMPREHENSIVE AUDIT TRACKING:
This system now tracks ALL admin actions including:
✅ Admin Login/Logout
✅ Admin Registration/Creation
✅ Document Request Approvals/Rejections
✅ ID Request Approvals/Rejections
✅ Incident Report Updates
✅ Announcement Creation/Deletion
✅ All API calls with detailed context

QUICK REFERENCE:
- Replace 'your_admin_username' with actual usernames
- Adjust date ranges as needed
- Modify file paths for CSV exports
- Use LIMIT clause for large datasets
- Add WHERE clauses to filter results

PERFORMANCE TIPS:
- Use indexes for frequently queried columns
- Limit result sets with LIMIT clause
- Use date ranges to reduce scan time
- Archive old data regularly
- Run ANALYZE after bulk inserts

SECURITY CONSIDERATIONS:
- Monitor failed login attempts
- Track unusual IP activity
- Watch for high-frequency actions
- Review admin activity patterns
- Export logs for external analysis
- Monitor approval/rejection patterns
- Track content modification activities

ACTION TYPES TO MONITOR:
- Admin Login/Logout: Authentication activities
- Update Document Request: Document approvals/rejections
- Update ID Request: ID creation approvals/rejections
- Update Incident Report: Incident status changes
- Create/Delete Announcement: Content management
- Admin Registration/Creation: User management
*/ 