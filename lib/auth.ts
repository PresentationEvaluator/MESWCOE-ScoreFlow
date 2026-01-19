// Authentication and authorization utilities
// @ts-ignore - bcryptjs doesn't have TypeScript definitions
import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { User, AuthUser, LoginInput } from './types';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a simple JWT-like token (you can enhance this)
 */
export function generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Login user with username and password
 */
export async function loginUser(credentials: LoginInput): Promise<AuthUser> {
    const { username, password } = credentials;

    if (!username || !password) {
        throw new Error('Username and password are required');
    }

    // Fetch user from database
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .limit(1);

    if (error || !users || users.length === 0) {
        throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
        throw new Error('Invalid username or password');
    }

    // Generate token
    const token = generateToken();

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
            user_id: user.id,
            token: token,
            expires_at: expiresAt.toISOString(),
        });

    if (sessionError) {
        console.error('Error creating session:', sessionError);
    }

    // Log audit
    await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'LOGIN',
        entity_type: 'USER',
        entity_id: user.id,
    });

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        token,
    };
}

/**
 * Logout user and invalidate session
 */
export async function logoutUser(userId: string, token: string): Promise<void> {
    // Invalidate session
    const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);

    if (error) {
        console.error('Error invalidating session:', error);
    }

    // Log audit
    await supabase.from('audit_log').insert({
        user_id: userId,
        action: 'LOGOUT',
        entity_type: 'USER',
        entity_id: userId,
    });
}

/**
 * Verify session token
 */
export async function verifySession(userId: string, token: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

    if (error || !data || data.length === 0) {
        return false;
    }

    // Update last activity
    await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', data[0].id);

    return true;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1);

    if (error || !data || data.length === 0) {
        return null;
    }

    return data[0];
}

/**
 * Register a new user (Admin only)
 */
export async function registerUser(
    email: string,
    username: string,
    password: string,
    role: 'admin' | 'teacher',
    full_name: string,
    createdByAdmin: string
): Promise<User> {
    // Check if user already exists
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email},username.eq.${username}`);

    if (existing && existing.length > 0) {
        throw new Error('Email or username already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data, error } = await supabase
        .from('users')
        .insert({
            email,
            username,
            password_hash: passwordHash,
            role,
            full_name,
            is_active: true,
        })
        .select()
        .limit(1);

    if (error || !data || data.length === 0) {
        throw new Error('Failed to create user');
    }

    // Log audit
    await supabase.from('audit_log').insert({
        user_id: createdByAdmin,
        action: 'CREATE_USER',
        entity_type: 'USER',
        entity_id: data[0].id,
        changes: { role, full_name },
    });

    return data[0];
}

/**
 * Get all teachers
 */
export async function getAllTeachers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

    if (error) {
        console.error('Error fetching teachers:', error);
        return [];
    }

    return data || [];
}

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data || [];
}

/**
 * Update an existing user (Admin only)
 */
export async function updateUser(
    userId: string,
    updates: Partial<{
        email: string;
        username: string;
        password: string;
        role: 'admin' | 'teacher';
        full_name: string;
        is_active: boolean;
    }>,
    updatedBy?: string,
): Promise<User> {
    const payload: any = { ...updates };

    // If password provided, hash it
    if (updates.password) {
        payload.password_hash = await hashPassword(updates.password as string);
        delete payload.password;
    }

    const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select()
        .limit(1);

    if (error || !data || data.length === 0) {
        throw new Error('Failed to update user');
    }

    // Log audit
    if (updatedBy) {
        await supabase.from('audit_log').insert({
            user_id: updatedBy,
            action: 'UPDATE_USER',
            entity_type: 'USER',
            entity_id: userId,
            changes: payload,
        });
    }

    return data[0];
}

/**
 * Soft-delete a user (set is_active=false). Admin only
 */
export async function deleteUser(userId: string, deletedBy?: string): Promise<void> {
    const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

    if (error) {
        throw new Error('Failed to delete user');
    }

    // Log audit
    if (deletedBy) {
        await supabase.from('audit_log').insert({
            user_id: deletedBy,
            action: 'DELETE_USER',
            entity_type: 'USER',
            entity_id: userId,
        });
    }
}
