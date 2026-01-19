'use client';

import AcademicYearDashboard from '@/components/AcademicYearDashboard';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AcademicYearsPage() {
    return (
        <ProtectedRoute>
            <AcademicYearDashboard />
        </ProtectedRoute>
    );
}
