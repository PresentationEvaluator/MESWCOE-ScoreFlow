"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Presentation, AcademicYear } from "@/lib/types";
import {
  getPresentationsByAcademicYear,
  createPresentation,
  deletePresentation,
  getPresentationStats,
  getAcademicYear,
} from "@/lib/database";
import { useAuth } from "@/providers/AuthProvider";
import toast from "react-hot-toast";
import {
  Plus,
  FileSpreadsheet,
  Trash2,
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
  const { user } = useAuth();
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

  async function loadData() {
    try {
      const [yearData, presentationsData] = await Promise.all([
        getAcademicYear(academicYearId),
        getPresentationsByAcademicYear(academicYearId),
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

  async function handleAddPresentation() {
    // Calculate next presentation number
    const currentCount = presentations.length;
    if (currentCount >= 4) {
      toast.error("Maximum 4 presentations allowed per academic year");
      return;
    }

    const nextNumber = currentCount + 1;
    const name = `Presentation ${nextNumber}`;
    const semester = nextNumber <= 2 ? "Semester 1" : "Semester 2"; // Assuming Sem 1/2 for Final Year

    try {
      const newPresentation = await createPresentation({
        name,
        semester,
        academic_year_id: academicYearId,
      });

      toast.success(`${name} created successfully`);
      loadData();
      // Automatically redirect to the new presentation? Maybe just list it.
    } catch (error) {
      console.error("Error creating presentation:", error);
      toast.error("Failed to create presentation");
    }
  }

  async function handleDeletePresentation(id: string, name: string) {
    const isTeacher = user?.role === "teacher";
    const confirmMessage = isTeacher
      ? `Are you sure you want to delete your groups from "${name}"? This will delete only your groups, students, and their evaluation marks.`
      : `Are you sure you want to delete "${name}"? This will delete all groups, students, and evaluation marks.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await deletePresentation(id, user?.id, user?.role);
      const successMessage = isTeacher
        ? "Your groups deleted successfully"
        : "Presentation deleted successfully";
      toast.success(successMessage);
      loadData();
    } catch (error) {
      console.error("Error deleting presentation:", error);
      toast.error("Failed to delete presentation");
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
  const nextPresentationNum = sortedPresentations.length + 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Logo and College Info */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <Logo className="h-16 w-16" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Modern Education Society's
                </h2>
                <h2 className="text-sm font-semibold text-gray-900">
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
            <UserProfile />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/academic-years/${academicYearId}`)}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Marks Entry: {academicYear.name}
                </h1>
                <p className="text-gray-600">
                  Manage presentations and enter marks
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative"
              >
                <div className="absolute top-4 right-4 text-gray-400">
                  <button
                    onClick={() =>
                      handleDeletePresentation(
                        presentation.id,
                        presentation.name,
                      )
                    }
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete Presentation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 pr-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {presentation.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {presentation.semester}
                  </p>
                </div>

                <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{stats_group} Groups</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    <span>{stats_student} Students</span>
                  </div>
                </div>

                <button
                  onClick={() =>
                    router.push(`/presentation/${encodeURIComponent(presentation.id)}`)
                  }
                  className="w-full btn btn-secondary"
                >
                  View Evaluation
                </button>
              </div>
            );
          })}

          {/* Add Presentation Card */}
          {nextPresentationNum <= 4 && (
            <button
              onClick={handleAddPresentation}
              className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary-500 hover:bg-white transition-all group h-full min-h-[200px]"
            >
              <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-primary-50 transition-colors mb-3">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Add {`Presentation ${nextPresentationNum}`}
              </h3>
              <p className="text-sm text-gray-500 text-center mt-1">
                {nextPresentationNum <= 2 ? "Semester 1" : "Semester 2"}
              </p>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
