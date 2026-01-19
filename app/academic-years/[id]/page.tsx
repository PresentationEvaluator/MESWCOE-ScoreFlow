'use client';

import Dashboard from '@/components/Dashboard';

export default function AcademicYearDetailsPage({ params }: { params: { id: string } }) {
    return <Dashboard academicYearId={params.id} />;
}
