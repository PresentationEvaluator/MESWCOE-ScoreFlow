"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getPresentationsByAcademicYear,
  getAllAcademicYears,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
  getPresentationsWithGroupsForTeacher,
} from "@/lib/database";
import { exportAnnualReportFormattedAndSeparated, exportAnnualReportBySemester } from "@/lib/excelExportFormatted";
import {
  exportPresentation1Report,
  exportPresentation2Report,
  exportPresentation3Report,
  exportPresentation4Report,
} from "@/lib/excelExportByPresentation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { AcademicYear, Presentation, Group } from "@/lib/types";
import Logo from "@/components/Logo";
import UserProfile from "@/components/UserProfile";

export default function ReportsPage() {
  const { user, isAdmin, isTeacher } = useAuth();
  const router = useRouter();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] =
    useState<AcademicYear | null>(null);
  const [selectedPresentation, setSelectedPresentation] =
    useState<Presentation | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [guides, setGuides] = useState<string[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Load academic years on mount
  useEffect(() => {
    loadAcademicYears();
  }, []);

  // Load presentations when academic year is selected
  useEffect(() => {
    if (selectedAcademicYear) {
      loadPresentations(selectedAcademicYear.id);
    }
  }, [selectedAcademicYear]);

  // Load groups when presentation is selected
  useEffect(() => {
    if (selectedPresentation && selectedAcademicYear) {
      loadGroups(selectedPresentation.id);
    }
  }, [selectedPresentation, selectedAcademicYear]);

  const loadAcademicYears = async () => {
    try {
      setIsLoading(true);
      const years = await getAllAcademicYears();
      setAcademicYears(years);

      // Auto-select the first academic year if available
      if (years.length > 0) {
        setSelectedAcademicYear(years[0]);
      }
    } catch (error) {
      console.error("Error loading academic years:", error);
      toast.error("Failed to load academic years");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresentations = async (academicYearId: string) => {
    try {
      const presen = isTeacher && user
        ? await getPresentationsWithGroupsForTeacher(academicYearId, user.id)
        : await getPresentationsByAcademicYear(academicYearId);
      setPresentations(presen);

      // Auto-select the first presentation if available
      if (presen.length > 0) {
        setSelectedPresentation(presen[0]);
      } else {
        setSelectedPresentation(null);
        setGroups([]);
      }
    } catch (error) {
      console.error("Error loading presentations:", error);
      toast.error("Failed to load presentations");
    }
  };

  const loadGroups = async (presentationId: string) => {
    try {
      let loadedGroups: Group[] = [];

      // Load groups based on user role
      if (isTeacher && user) {
        // Teachers see only their groups
        loadedGroups = await getGroupsByPresentationForTeacher(presentationId, user.id);
      } else {
        // Admins see all groups
        loadedGroups = await getGroupsByPresentation(presentationId);
      }

      setGroups(loadedGroups);

      // Extract unique guide names and sort them
      const uniqueGuides = Array.from(
        new Set(loadedGroups.map((g: any) => g.guide_name).filter(Boolean))
      ).sort();
      setGuides(uniqueGuides);
      setSelectedGuide("all"); // Reset guide filter when presentation changes
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Failed to load groups for this presentation");
      setGroups([]);
      setGuides([]);
      setSelectedGuide("all");
    }
  };

  const handleExportAnnualReport = async () => {
    if (!selectedAcademicYear) {
      toast.error("Please select an academic year");
      return;
    }

    try {
      setIsExporting(true);
      toast.loading("Verifying authorization...");

      // Backend authorization verification
      if (user && user.token) {
        const authResponse = await fetch("/api/reports/export-annual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academicYearId: selectedAcademicYear.id,
            userId: user.id,
            token: user.token,
          }),
        });

        if (!authResponse.ok) {
          toast.dismiss();
          const errorData = await authResponse.json();
          toast.error(
            errorData.error || "You are not authorized to export this report",
          );
          return;
        }
      }

      toast.loading("Generating annual report...");
      await exportAnnualReportBySemester(
        selectedAcademicYear.id,
        user?.id,
        (user as any)?.role,
        selectedGuide === "all" ? undefined : selectedGuide,
      );
      toast.dismiss();
      toast.success("Annual report exported successfully");
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting annual report:", error);
      toast.error("Failed to export annual report");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPresentationReport = async (presentationNumber: number) => {
    if (!selectedAcademicYear) {
      toast.error("Please select an academic year");
      return;
    }

    if (!selectedPresentation) {
      toast.error("Please select a presentation");
      return;
    }

    try {
      setIsExporting(true);
      toast.loading(
        `Verifying authorization for presentation ${presentationNumber}...`,
      );

      // Backend authorization verification
      if (user && user.token) {
        const authResponse = await fetch("/api/reports/export-presentation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presentationId: selectedPresentation.id,
            presentationNumber,
            userId: user.id,
            token: user.token,
          }),
        });

        if (!authResponse.ok) {
          toast.dismiss();
          const errorData = await authResponse.json();
          toast.error(
            errorData.error || "You are not authorized to export this report",
          );
          return;
        }
      }

      toast.loading(`Generating presentation ${presentationNumber} report...`);

      const guideParam = selectedGuide === "all" ? undefined : selectedGuide;

      switch (presentationNumber) {
        case 1:
          await exportPresentation1Report(selectedAcademicYear.id, user?.id, (user as any)?.role, guideParam);
          break;
        case 2:
          await exportPresentation2Report(selectedAcademicYear.id, user?.id, (user as any)?.role, guideParam);
          break;
        case 3:
          await exportPresentation3Report(selectedAcademicYear.id, user?.id, (user as any)?.role, guideParam);
          break;
        case 4:
          await exportPresentation4Report(selectedAcademicYear.id, user?.id, (user as any)?.role, guideParam);
          break;
        default:
          throw new Error("Invalid presentation number");
      }

      toast.dismiss();
      toast.success(
        `Presentation ${presentationNumber} report exported successfully`,
      );
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting presentation report:", error);
      toast.error("Failed to export presentation report");
    } finally {
      setIsExporting(false);
    }
  };

  // Authorization check: Only allow admins
  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              Reports are only available for administrators. Please contact your administrator for report access.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-6">
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                  <p className="text-sm text-gray-600">
                    {isAdmin
                      ? "View and download reports for all academic years"
                      : "View and download your assigned group reports"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading reports...</p>
            </div>
          ) : academicYears.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Academic Years Available
              </h3>
              <p className="text-gray-600">
                There are no academic years to report on. Please create an
                academic year first.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Selection Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Report Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Academic Year Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year
                    </label>
                    <select
                      value={selectedAcademicYear?.id || ""}
                      onChange={(e) => {
                        const year = academicYears.find(
                          (y) => y.id === e.target.value,
                        );
                        setSelectedAcademicYear(year || null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select academic year...</option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Presentation Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Presentation
                    </label>
                    <select
                      value={selectedPresentation?.id || ""}
                      onChange={(e) => {
                        const pres = presentations.find(
                          (p) => p.id === e.target.value,
                        );
                        setSelectedPresentation(pres || null);
                      }}
                      disabled={
                        !selectedAcademicYear || presentations.length === 0
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="">
                        {!selectedAcademicYear
                          ? "Select academic year first"
                          : presentations.length === 0
                            ? "No presentations"
                            : "Select presentation..."}
                      </option>
                      {presentations.map((pres) => {
                        const sem = pres.semester;
                        const semDisplay = sem === "1" ? "Semester 1" : sem === "2" ? "Semester 2" : sem ? `Semester ${sem}` : "Semester N/A";
                        return (
                          <option key={pres.id} value={pres.id}>
                            {pres.name} - {semDisplay}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Guide Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Guide
                    </label>
                    <select
                      value={selectedGuide}
                      onChange={(e) => setSelectedGuide(e.target.value)}
                      disabled={!selectedPresentation || guides.length === 0}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="all">All Guides</option>
                      {guides.map((guide) => (
                        <option key={guide} value={guide}>
                          {guide}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Groups Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Groups in Selection
                    </label>
                    <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-indigo-600">
                        {selectedGuide === "all"
                          ? groups.length
                          : groups.filter((g: any) => g.guide_name === selectedGuide).length}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedGuide === "all"
                          ? "Total groups"
                          : `Groups by ${selectedGuide}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Options Section */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Export All Presentations Report
                    </h3>
                    <p className="text-sm text-gray-600">
                      Download a complete Excel file organized by semester (Semester 1 & 2) with all evaluation marks
                    </p>
                  </div>
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-xs text-gray-600 font-mono">
                    📊 Sheet 1: Semester 1 (P1+P2) | Sheet 2: Semester 2 (P3+P4)
                  </p>
                </div>

                {isAdmin ? (
                  <p className="text-xs text-green-700 bg-green-50 rounded px-3 py-2 mb-6">
                    ✓ Admin Access: Full reports with all groups
                  </p>
                ) : (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded px-3 py-2 mb-6">
                    ✓ Your groups only in these reports
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleExportPresentationReport(num)}
                      disabled={!selectedAcademicYear || isExporting}
                      className="px-4 py-3 text-sm font-medium bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      P{num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportAnnualReport}
                  disabled={!selectedAcademicYear || isExporting}
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export Complete Report (All Presentations)"}
                </button>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  About Reports
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {isAdmin && (
                    <>
                      <li>
                        • As an admin, you have access to all reports across the
                        system
                      </li>
                      <li>• You can view and download reports for any group</li>
                    </>
                  )}
                  {isTeacher && (
                    <>
                      <li>
                        • As a teacher, you can only view reports for your
                        assigned groups
                      </li>
                      <li>
                        • You cannot access reports for other teachers' groups
                      </li>
                    </>
                  )}
                  <li>
                    • Reports are generated in professional Excel format with
                    proper formatting
                  </li>
                  <li>
                    • All evaluations and student data are included in the
                    reports
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
