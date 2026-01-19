
import InputDashboard from '@/components/InputDashboard';

export default function ManagePage({ searchParams }: { searchParams: { academicYearId: string } }) {
    if (!searchParams.academicYearId) {
        return <div className="p-8 text-center text-red-600">Please provide an academic year ID.</div>;
    }

    return <InputDashboard academicYearId={searchParams.academicYearId} />;
}
