'use client';

import Dashboard from '@/components/Dashboard';

export default function AcademicYearDetailsPage({ params }: { params: { id: string } }) {
    // The ID can be either a UUID or a short slug
    // Dashboard component will handle the lookup
    return <Dashboard academicYearId={params.id} />;
}
