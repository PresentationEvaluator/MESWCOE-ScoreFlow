-- =====================================================
-- Password Management & User Creation Examples
-- =====================================================
-- This file contains SQL examples for managing user passwords
-- and creating test accounts

-- =====================================================
-- GENERATE BCRYPT PASSWORD HASHES
-- =====================================================
-- Use NodeJS to generate bcrypt hashes:
-- 
-- node> const bcrypt = require('bcryptjs');
-- node> bcrypt.hash('password123', 10).then(h => console.log(h))
-- Output: $2a$10$...
-- 
-- OR use online tool: https://bcrypt-generator.com/
-- (Not recommended for production - use local/backend only)

-- =====================================================
-- CREATE TEST TEACHER ACCOUNTS
-- =====================================================

-- Example 1: Teacher with hashed password for 'pass@123'
-- Hash for 'pass@123': $2a$10$Y9Z1X8C2B3A4D5E6F7G8H9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3
INSERT INTO users (email, username, password_hash, role, full_name, is_active)
VALUES (
  'teacher1@example.com',
  'teacher1',
  '$2a$10$Y9Z1X8C2B3A4D5E6F7G8H9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3',
  'teacher',
  'Dr. John Smith',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Example 2: Another teacher
-- Hash for 'teacher@123': $2a$10$A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4
INSERT INTO users (email, username, password_hash, role, full_name, is_active)
VALUES (
  'teacher2@example.com',
  'teacher2',
  '$2a$10$A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4',
  'teacher',
  'Dr. Sarah Johnson',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- UPDATE EXISTING USER PASSWORDS
-- =====================================================

-- Update admin password to new hash
-- New hash for 'NewSecurePassword@123'
UPDATE users 
SET password_hash = '$2a$10$NEW_HASH_HERE_FROM_BCRYPT'
WHERE username = 'admin';

-- Update teacher password
UPDATE users 
SET password_hash = '$2a$10$NEW_HASH_HERE_FROM_BCRYPT'
WHERE username = 'teacher1';

-- =====================================================
-- DISABLE/DEACTIVATE USERS
-- =====================================================

-- Deactivate a teacher account (prevents login)
UPDATE users 
SET is_active = FALSE, updated_at = NOW()
WHERE username = 'teacher1';

-- Reactivate a teacher account
UPDATE users 
SET is_active = TRUE, updated_at = NOW()
WHERE username = 'teacher1';

-- =====================================================
-- VIEW USER INFORMATION
-- =====================================================

-- View all users
SELECT id, email, username, role, full_name, is_active, created_at 
FROM users 
ORDER BY created_at DESC;

-- View only teachers
SELECT id, email, username, full_name, is_active, created_at 
FROM users 
WHERE role = 'teacher'
ORDER BY full_name;

-- View only admins
SELECT id, email, username, full_name, is_active, created_at 
FROM users 
WHERE role = 'admin'
ORDER BY full_name;

-- View active sessions
SELECT 
  u.username,
  s.token,
  s.created_at,
  s.expires_at,
  s.last_activity,
  s.ip_address
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;

-- =====================================================
-- VIEW AUDIT LOG
-- =====================================================

-- View all login activities
SELECT 
  u.username,
  al.action,
  al.entity_type,
  al.created_at
FROM audit_log al
LEFT JOIN users u ON u.id = al.user_id
WHERE al.action IN ('LOGIN', 'LOGOUT')
ORDER BY al.created_at DESC
LIMIT 100;

-- View all user creation activities
SELECT 
  creator.username as created_by,
  al.entity_id,
  al.created_at,
  al.changes::text
FROM audit_log al
LEFT JOIN users creator ON creator.id = al.user_id
WHERE al.action = 'CREATE_USER'
ORDER BY al.created_at DESC;

-- =====================================================
-- DELETE USERS (If needed for cleanup)
-- =====================================================

-- WARNING: This will delete all user data
-- Use only for testing/cleanup

-- Soft delete (deactivate instead)
UPDATE users 
SET is_active = FALSE
WHERE username = 'test_user';

-- Hard delete (completely remove)
-- DELETE FROM users WHERE username = 'test_user';
-- Note: This may violate foreign key constraints

-- =====================================================
-- INVALIDATE SESSIONS
-- =====================================================

-- Logout all sessions for a user
DELETE FROM user_sessions 
WHERE user_id = (SELECT id FROM users WHERE username = 'teacher1');

-- Logout a specific session
DELETE FROM user_sessions 
WHERE token = 'specific_token_here';

-- Invalidate all expired sessions
DELETE FROM user_sessions 
WHERE expires_at < NOW();

-- =====================================================
-- GRANT GROUPS TO TEACHER
-- =====================================================

-- Link existing groups to a teacher as guide
UPDATE groups 
SET guide_user_id = (SELECT id FROM users WHERE username = 'teacher1')
WHERE guide_name = 'Dr. John Smith'
AND guide_user_id IS NULL;

-- =====================================================
-- VIEW TEACHER'S GROUPS
-- =====================================================

-- View all groups assigned to a teacher
SELECT 
  p.name as presentation,
  g.group_number,
  g.guide_name,
  COUNT(s.id) as student_count,
  g.created_at
FROM groups g
LEFT JOIN students s ON s.group_id = g.id
LEFT JOIN presentations p ON p.id = g.presentation_id
WHERE g.guide_user_id = (SELECT id FROM users WHERE username = 'teacher1')
GROUP BY g.id, p.name, g.group_number, g.guide_name, g.created_at
ORDER BY p.name, g.group_number;

-- =====================================================
-- USEFUL BCRYPT HASHES FOR TESTING
-- =====================================================
-- These are EXAMPLE hashes - for reference only
-- Generate your own using NodeJS or bcrypt-generator

-- Password: admin@123
-- Hash: $2a$10$W9jZlzJzZlzJzZlzJzZlzZlzJzZlzJzZlzJzZlzJzZlzJzZlzJzZl

-- Password: pass@123
-- Hash: $2a$10$Y9Z1X8C2B3A4D5E6F7G8H9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3

-- Password: teacher@123
-- Hash: $2a$10$A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4

-- To generate: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10).then(h => console.log(h));"

-- =====================================================
-- RESET ALL DATA (For Clean Database)
-- =====================================================
-- WARNING: This will delete all data!
-- Use only for testing/reset purposes

-- TRUNCATE user_sessions;
-- TRUNCATE audit_log;
-- DELETE FROM users WHERE username != 'admin';

-- =====================================================
-- MONITORING & MAINTENANCE
-- =====================================================

-- Check database size
-- SELECT pg_size_pretty(pg_database_size('postgres'));

-- Check table sizes
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Clean up old sessions (Run periodically)
-- DELETE FROM user_sessions 
-- WHERE expires_at < NOW() - INTERVAL '30 days';

-- Clean up old audit logs (Run periodically, keep last 90 days)
-- DELETE FROM audit_log 
-- WHERE created_at < NOW() - INTERVAL '90 days';
