"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Presentation, AcademicYear } from "@/lib/types";
import {
  getPresentationsByAcademicYear,
  getPresentationStats,
  getAcademicYear,
} from "@/lib/database";
import { exportAnnualReport } from "@/lib/excelExport";
import {
  exportSemester1Report,
  exportSemester2Report,
} from "@/lib/excelExportByPresentation";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  Users,
  GraduationCap,
  ArrowLeft,
  Lock,
  Download,
  Edit,
  ChevronDown,
} from "lucide-react";
import UserProfile from "./UserProfile";
import Logo from "./Logo";
import { useAuth } from "@/providers/AuthProvider";

interface DashboardProps {
  academicYearId?: string;
}

export default function Dashboard({ academicYearId }: DashboardProps) {
  const router = useRouter();
  const { user, isAdmin, isTeacher } = useAuth();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<
    Record<string, { groupCount: number; studentCount: number }>
  >({});
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);

  useEffect(() => {
    if (academicYearId) {
      loadData();
    }
  }, [academicYearId, user, isAdmin, isTeacher]);

  async function loadData() {
    if (!academicYearId) return;

    try {
      const [yearData, presentationsData] = await Promise.all([
        getAcademicYear(academicYearId),
        getPresentationsByAcademicYear(academicYearId),
      ]);

      setAcademicYear(yearData);

      // Sort presentations in order 1 -> 2 -> 3 -> 4
      const sortedPresentations = [...presentationsData].sort((a, b) => {
        const aNum = parseInt(a.name.match(/\d+/)?.[0] || "999");
        const bNum = parseInt(b.name.match(/\d+/)?.[0] || "999");
        if (aNum !== bNum) return aNum - bNum;
        return a.name.localeCompare(b.name);
      });

      setPresentations(sortedPresentations);

      // Load stats for each presentation
      const statsData: Record<
        string,
        { groupCount: number; studentCount: number }
      > = {};
      for (const presentation of sortedPresentations) {
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

  async function handleDownloadAnnualReport() {
    if (!academicYearId) return;
    try {
      toast.loading("Generating Annual Report...");
      await exportAnnualReport(academicYearId, user?.id, user?.role);
      toast.dismiss();
      toast.success("Annual Report downloaded successfully");
    } catch (error: any) {
      toast.dismiss();
      console.error("Error exporting Annual Report:", error);
      toast.error(error.message || "Failed to export Annual Report");
    }
  }

  async function handleExportSemester1() {
    if (!academicYearId) return;
    try {
      toast.loading("Generating Semester 1 Report...");
      await exportSemester1Report(academicYearId, user?.id, user?.role);
      toast.dismiss();
      toast.success("Semester 1 Report downloaded successfully");
      setShowSemesterDropdown(false);
    } catch (error: any) {
      toast.dismiss();
      console.error("Error exporting Semester 1:", error);
      toast.error(error.message || "Failed to export Semester 1 Report");
    }
  }

  async function handleExportSemester2() {
    if (!academicYearId) return;
    try {
      toast.loading("Generating Semester 2 Report...");
      await exportSemester2Report(academicYearId, user?.id, user?.role);
      toast.dismiss();
      toast.success("Semester 2 Report downloaded successfully");
      setShowSemesterDropdown(false);
    } catch (error: any) {
      toast.dismiss();
      console.error("Error exporting Semester 2:", error);
      toast.error(error.message || "Failed to export Semester 2 Report");
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading presentations...</p>
        </div>
      </div>
    );
  }

  if (!academicYear) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Academic Year not found</p>
          <button
            onClick={() => router.push("/academic-years")}
            className="btn btn-primary mt-4"
          >
            Back to Academic Years
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
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
                onClick={() => router.push("/academic-years")}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {academicYear.name}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage evaluations and view presentations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowSemesterDropdown(!showSemesterDropdown)}
                  className="btn btn-info flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Semester Report
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showSemesterDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>
                {showSemesterDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button
                      onClick={handleExportSemester1}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Semester 1 Report
                    </button>
                    <button
                      onClick={handleExportSemester2}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Semester 2 Report
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleDownloadAnnualReport}
                className="btn btn-success flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Annual Report
              </button>
              <button
                onClick={() =>
                  router.push(`/marks-entry?academicYearId=${academicYearId}`)
                }
                className="btn btn-primary flex items-center gap-2"
              >
                <Edit className="w-5 h-5" />
                Marks Entry
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {presentations.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No presentations yet
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create presentations and add groups to start entering evaluation
              marks.
            </p>
            <button
              onClick={() =>
                router.push(`/marks-entry?academicYearId=${academicYearId}`)
              }
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Go to Marks Entry
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Presentations
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {presentations.length} presentation
                    {presentations.length !== 1 ? "s" : ""} available for
                    evaluation
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {presentations.map((presentation) => {
                const presentationNumber = parseInt(
                  presentation.name.match(/\d+/)?.[0] || "0",
                );
                const semesterMap: Record<number, string> = {
                  1: "Semester 1",
                  2: "Semester 1",
                  3: "Semester 2",
                  4: "Semester 2",
                };
                const colors: Record<number, string> = {
                  1: "from-blue-500 to-blue-600",
                  2: "from-purple-500 to-purple-600",
                  3: "from-emerald-500 to-emerald-600",
                  4: "from-orange-500 to-orange-600",
                };

                return (
                  <div
                    key={presentation.id}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
                    onClick={() =>
                      router.push(
                        `/presentation/${encodeURIComponent(presentation.id)}?readonly=true`,
                      )
                    }
                  >
                    <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow bg-white">
                      {/* Gradient Header */}
                      <div
                        className={`h-24 bg-gradient-to-br ${colors[presentationNumber] || colors[1]
                          } relative`}
                      >
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -mr-10 -mt-10"></div>
                        </div>
                        <div className="absolute inset-0 flex items-end p-4">
                          <h3 className="text-2xl font-bold text-white">
                            {presentation.name}
                          </h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          {presentation.semester && (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                              {presentation.semester}
                            </span>
                          )}
                        </div>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Groups</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {stats[presentation.id]?.groupCount || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                              <GraduationCap className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Students</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {stats[presentation.id]?.studentCount || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/presentation/${encodeURIComponent(presentation.id)}?readonly=true`,
                            );
                          }}
                          className="w-full py-2 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors group-hover:border-blue-400"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
