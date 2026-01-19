'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, AuthContextType, UserRole } from '@/lib/types';
import { loginUser, logoutUser, verifySession, getUserById } from '@/lib/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize auth from localStorage and verify session
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedAuth = localStorage.getItem('auth');
                if (storedAuth) {
                    const { userId, token } = JSON.parse(storedAuth);
                    
                    // Verify session is still valid
                    const isValid = await verifySession(userId, token);
                    
                    if (isValid) {
                        const userData = await getUserById(userId);
                        if (userData) {
                            setUser({
                                ...userData,
                                token,
                            });
                        } else {
                            // User not found or disabled
                            localStorage.removeItem('auth');
                        }
                    } else {
                        // Session expired
                        localStorage.removeItem('auth');
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                localStorage.removeItem('auth');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (username: string, password: string) => {
        try {
            setLoading(true);
            const authUser = await loginUser({ username, password });
            
            // Store auth in localStorage
            localStorage.setItem('auth', JSON.stringify({
                userId: authUser.id,
                token: authUser.token,
            }));
            
            setUser(authUser);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            if (user && user.token) {
                await logoutUser(user.id, user.token);
            }
            localStorage.removeItem('auth');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isTeacher: user?.role === 'teacher',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
