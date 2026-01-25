"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Presentation, AcademicYear } from "@/lib/types";
import {
  getPresentationsByAcademicYear,
  getPresentationStats,
  getAcademicYear,
  getPresentationsWithGroupsForTeacher,
} from "@/lib/database";
import { useAuth } from "@/providers/AuthProvider";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  Users,
  GraduationCap,
  ArrowLeft,
  Lock,
} from "lucide-react";
import UserProfile from "./UserProfile";
import Logo from "./Logo";

export default function InputDashboard({
  academicYearId,
}: {
  academicYearId: string;
}) {
  const router = useRouter();
  const { user, isTeacher } = useAuth();
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [stats, setStats] = useState<
    Record<string, { groupCount: number; studentCount: number }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (academicYearId) {
      loadData();
    }
  }, [academicYearId]);

  // Reload data when the page regains focus (user returns from presentation view)
  useEffect(() => {
    const handleFocus = () => {
      if (academicYearId) {
        loadData();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [academicYearId]);

  async function loadData() {
    try {
      const [yearData, presentationsData] = await Promise.all([
        getAcademicYear(academicYearId),
        isTeacher && user
          ? getPresentationsWithGroupsForTeacher(academicYearId, user.id)
          : getPresentationsByAcademicYear(academicYearId),
      ]);

      setAcademicYear(yearData);
      setPresentations(presentationsData);

      // Load stats
      const statsData: Record<
        string,
        { groupCount: number; studentCount: number }
      > = {};
      for (const presentation of presentationsData) {
        const presentationStats = await getPresentationStats(
          presentation.id,
          user?.id,
          user?.role,
        );
        statsData[presentation.id] = presentationStats;
      }
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!academicYear)
    return <div className="text-center p-8">Academic Year not found</div>;

  // Sort presentations by name/created_at to ensure 1, 2, 3, 4 order
  const sortedPresentations = [...presentations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="min-h-screen bg-gray-50 prevent-scroll">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Logo and College Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
              <Logo className="h-12 sm:h-16 w-12 sm:w-16 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Modern Education Society's
                </h2>
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Wadia College of Engineering, Pune.
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Affiliated to SPPU, Approved by AICTE,
                </p>
                <p className="text-xs text-gray-600">
                  Accredited by NAAC with 'A++' Grade, Accredited by NBA
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <UserProfile />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => router.push(`/academic-years/${academicYearId}`)}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  Marks Entry: {academicYear.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Manage presentations and enter marks
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedPresentations.map((presentation) => {
            // Determine which internal evaluation this presentation is for
            const presentationNumber = parseInt(
              presentation.name.match(/\d+/)?.[0] || "0",
            );
            const stats_group = stats[presentation.id]?.groupCount || 0;
            const stats_student = stats[presentation.id]?.studentCount || 0;

            return (
              <div
                key={presentation.id}
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 truncate">
                    {presentation.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {presentation.semester}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600 flex-grow">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>{stats_group} Groups</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 flex-shrink-0" />
                    <span>{stats_student} Students</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    router.push(`/presentation/${presentation.id}`)
                  }
                  className="w-full btn btn-secondary mt-auto"
                >
                  View Evaluation
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
