'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';

export default function Home() {
    const { isAuthenticated, loading, isTeacher } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (isAuthenticated) {
                // Teachers should land directly on Academic Years
                if (isTeacher) {
                    redirect('/academic-years');
                } else {
                    redirect('/dashboard');
                }
            } else {
                redirect('/login');
            }
        }
    }, [isAuthenticated, loading, isTeacher]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>
    );
}
