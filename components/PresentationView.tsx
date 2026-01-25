"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Presentation,
  GroupWithStudents,
  Evaluation,
  CalculatedMarks,
} from "@/lib/types";
import {
  getPresentation,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
  updateEvaluation,
  getPresentationsByAcademicYear, // Added for sibling fetch
} from "@/lib/database";
import { calculateAllMarks } from "@/lib/calculations";
import GroupManagement from "./GroupManagementWithRoles";
import { Download, Users, ArrowLeft, ChevronDown, Edit2 } from "lucide-react";
import { exportPresentationToExcel } from "@/lib/excelExport";
import {
  exportPresentation1Report,
  exportPresentation2Report,
  exportPresentation3Report,
  exportPresentation4Report,
  exportSemester1Report,
  exportSemester2Report,
  exportProjectClassificationReport,
} from "@/lib/excelExportByPresentation";
import toast from "react-hot-toast";
import UserProfile from "./UserProfile";
import Logo from "./Logo";
import { useAuth } from "@/providers/AuthProvider";

interface PresentationViewProps {
  presentationId: string;
}

// Validation constants
const MARK_LIMITS: Record<string, number> = {
  // Pres 1
  problem_identification: 10,
  literature_survey: 10,
  software_engineering: 10,
  requirement_analysis: 10,
  srs: 10,
  // Pres 2
  individual_capacity: 10,
  team_work: 10,
  presentation_qa: 10,
  paper_presentation: 20,
  // Pres 3
  identification_module: 10,
  coding: 10,
  understanding: 10,
  // Pres 4
  testing: 10,
  participation_conference: 10,
  publication: 10,
  project_report: 20,
  // Classification fields (capped at 10 as per schema, though used as checkboxes/binary usually, we allow 0-10)
  classification_product: 10,
  classification_research: 10,
  classification_application: 10,
  classification_design: 10,
  // Finance fields
  finance_institute: 10,
  finance_self: 10,
  finance_industry: 10,
};

export default function PresentationView({
  presentationId,
}: PresentationViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadOnly = searchParams.get("readonly") === "true";
  const { user, isAdmin, isTeacher } = useAuth();

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [groups, setGroups] = useState<GroupWithStudents[]>([]);

  // Sibling (Other Phase) Data
  const [siblingPresentation, setSiblingPresentation] =
    useState<Presentation | null>(null);
  const [siblingGroups, setSiblingGroups] = useState<GroupWithStudents[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [lastLoadedAsTeacher, setLastLoadedAsTeacher] = useState<boolean | null>(null);

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    // Only load if user is fully loaded (not null and auth is resolved)
    if (user !== undefined) {
      // If we previously loaded as a different authorization level, reload
      // This prevents showing ALL groups when teacher first loads (before isTeacher resolves)
      if (lastLoadedAsTeacher !== null && lastLoadedAsTeacher !== isTeacher) {
        setGroups([]);
        setSiblingGroups([]);
      }
      loadData();
    }
  }, [presentationId, user?.id, isTeacher]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load Current
      const presData = await getPresentation(presentationId);

      // Load groups based on user role
      let groupsData: GroupWithStudents[];
      if (isTeacher && user) {
        groupsData = await getGroupsByPresentationForTeacher(
          presentationId,
          user.id,
        );
      } else {
        groupsData = await getGroupsByPresentation(presentationId);
      }

      setPresentation(presData);
      setAcademicYearId(presData.academic_year_id);
      setGroups(groupsData);
      setLastLoadedAsTeacher(isTeacher); // Track authorization level used for this load

      // Authorization check: If teacher, verify all groups belong to them
      // This prevents showing unauthorized groups even if data somehow got mixed up
      if (isTeacher && user) {
        const unauthorizedGroups = groupsData.filter(
          (g) => g.guide_user_id !== user.id
        );
        
        if (unauthorizedGroups.length > 0) {
          toast.error("Security: Unauthorized group access detected. Clearing data.");
          setGroups([]);
          setLastLoadedAsTeacher(null); // Force reload on next auth change
          router.push(`/dashboard/${presData.academic_year_id}`);
          return;
        }

        // Teachers can view presentations even with no groups - they might be creating them
        // Only redirect if there's unauthorized data
      }

      // Fetch Sibling
      const allPres = await getPresentationsByAcademicYear(
        presData.academic_year_id,
      );
      let siblingName = "";

      if (presData.name.endsWith("1"))
        siblingName = presData.name.replace("1", "2");
      else if (presData.name.endsWith("2"))
        siblingName = presData.name.replace("2", "1");
      else if (presData.name.endsWith("3"))
        siblingName = presData.name.replace("3", "4");
      else if (presData.name.endsWith("4"))
        siblingName = presData.name.replace("4", "3");

      const sibling = allPres.find((p) => p.name === siblingName);
      if (sibling) {
        setSiblingPresentation(sibling);
        // Load sibling groups based on user role
        let sGroups: GroupWithStudents[];
        if (isTeacher && user) {
          sGroups = await getGroupsByPresentationForTeacher(
            sibling.id,
            user.id,
          );
        } else {
          sGroups = await getGroupsByPresentation(sibling.id);
        }
        
        // Authorization check for sibling groups
        if (isTeacher && user) {
          const unauthorizedSiblingGroups = sGroups.filter(
            (g) => g.guide_user_id !== user.id
          );
          
          if (unauthorizedSiblingGroups.length > 0) {
            toast.error("Security: Unauthorized sibling group access detected.");
            setSiblingGroups([]);
            return;
          }
        }
        
        setSiblingGroups(sGroups);
      }
    } catch (error) {
      console.error("Error loading presentation:", error);
      const errorMessage = error instanceof Error ? error.message : "Presentation not found";
      setError(errorMessage);
      setPresentation(null);
      toast.error("Failed to load presentation: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkChange = async (
    studentId: string,
    field: keyof Evaluation,
    value: string,
  ) => {
    const numValue = value === "" ? 0 : parseFloat(value);

    // Validation
    const maxMark = MARK_LIMITS[field] || 50;
    if (numValue < 0 || numValue > maxMark) {
      toast.error(`Mark must be between 0 and ${maxMark}`);
      return;
    }

    const fieldKey = `${studentId}-${field}`;

    // Optimistic update (use Partial cast for evaluation to avoid TS errors when id or other fields are missing)
    setGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        students: group.students.map((student) =>
          student.id === studentId
            ? {
              ...student,
              evaluation: {
                ...(student.evaluation as Partial<Evaluation>),
                [field]: numValue,
              } as any,
            }
            : student,
        ),
      })),
    );

    if (debounceTimers.current[fieldKey]) {
      clearTimeout(debounceTimers.current[fieldKey]);
    }

    debounceTimers.current[fieldKey] = setTimeout(async () => {
      setSavingStates((prev) => ({ ...prev, [fieldKey]: true }));
      try {
        await updateEvaluation(studentId, field as any, numValue, isTeacher ? user?.id : undefined);
      } catch (error) {
        console.error("Error updating evaluation:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save mark");
        loadData();
      } finally {
        setSavingStates((prev) => ({ ...prev, [fieldKey]: false }));
      }
    }, 500);
  };

  const handleGroupFieldChange = async (
    groupId: string,
    field: keyof Evaluation,
    value: any,
  ) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // Optimistic update for all students in group
    setGroups((currentGroups) =>
      currentGroups.map((g) =>
        g.id === groupId
          ? {
            ...g,
            students: g.students.map((student) => ({
              ...student,
              evaluation: {
                ...(student.evaluation as Partial<Evaluation>),
                [field]: value,
              } as any,
            })),
          }
          : g,
      ),
    );

    // Persist for each student
    try {
      await Promise.all(
        group.students.map((s) => updateEvaluation(s.id, field as any, value, isTeacher ? user?.id : undefined)),
      );
    } catch (error) {
      console.error("Error updating group field:", error);
      toast.error("Failed to save field for group");
      loadData();
    }
  };

  async function handleExportExcel() {
    if (!presentation) return;
    try {
      toast.loading("Generating Excel file...");

      // Route to correct export function based on presentation name
      if (presentation.name.endsWith("1")) {
        await exportPresentation1Report(
          presentation.academic_year_id,
          user?.id,
          user?.role,
        );
      } else if (presentation.name.endsWith("2")) {
        await exportPresentation2Report(
          presentation.academic_year_id,
          user?.id,
          user?.role,
        );
      } else if (presentation.name.endsWith("3")) {
        await exportPresentation3Report(
          presentation.academic_year_id,
          user?.id,
          user?.role,
        );
      } else if (presentation.name.endsWith("4")) {
        await exportPresentation4Report(
          presentation.academic_year_id,
          user?.id,
          user?.role,
        );
      }

      toast.dismiss();
      toast.success("Excel file downloaded successfully");
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting to Excel:", error);
      toast.error("Failed to export to Excel");
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
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting Semester 1:", error);
      toast.error("Failed to export Semester 1 Report");
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
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting Semester 2:", error);
      toast.error("Failed to export Semester 2 Report");
    }
  }

  async function handleExportClassification() {
    if (!presentation) return;
    try {
      toast.loading("Generating Project Classification Report...");
      await exportProjectClassificationReport(
        presentation.academic_year_id,
        user?.id,
        user?.role,
      );
      toast.dismiss();
      toast.success("Classification report downloaded successfully");
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting classification:", error);
      toast.error("Failed to export classification report");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-lg font-semibold text-red-800 mb-2">Error Loading Presentation</p>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!presentation) return null;

  // Logic for View Mode:
  // If name contains '1' or '2', show Sem 1 fields (P1 + P2).
  // If name contains '3' or '4', show Sem 2 fields (P3 + P4).
  const isSemester2 =
    presentation.name.includes("3") || presentation.name.includes("4");

  // Ability to edit relies on which presentation is currently Loaded (presentationId).
  // If Loaded is P1, we can Edit P1 fields. P2 fields are read-only views of sibling data.
  const isPres1 = presentation.name.endsWith("1");
  const isPres2 = presentation.name.endsWith("2");
  const isPres3 = presentation.name.endsWith("3");
  const isPres4 = presentation.name.endsWith("4");

  return (
    <div className="min-h-screen bg-gray-50 prevent-scroll">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-full px-3 sm:px-6 lg:px-8 py-4">
          {/* Logo and College Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
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
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {presentation.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">{presentation.semester}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {!isReadOnly && isPres1 && (
                <button
                  onClick={() => setShowGroupManagement(true)}
                  className="btn btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Users className="w-4 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Manage Groups</span>
                  <span className="sm:hidden">Groups</span>
                </button>
              )}
              {/* Semester Reports Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowSemesterDropdown(!showSemesterDropdown)}
                  className="btn btn-info flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-5 flex-shrink-0" />
                  <span className="truncate">Semester Report</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform flex-shrink-0 hidden sm:block ${showSemesterDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showSemesterDropdown && (
                  <div className="absolute right-0 mt-2 w-full sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
              {isPres1 && (
                <button
                  onClick={() => router.push(`/classification/${presentationId}`)}
                  className="btn bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2 justify-center w-full sm:w-auto"
                >
                  <Users className="w-4 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Project Classification</span>
                  <span className="sm:hidden">Classification</span>
                </button>
              )}
              {isReadOnly && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("readonly");
                    router.push(`/presentation/${presentationId}?${params.toString()}`);
                  }}
                  className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 justify-center w-full sm:w-auto"
                >
                  <Edit2 className="w-4 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">Edit Marks</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              )}
              <button
                onClick={handleExportExcel}
                disabled={groups.length === 0}
                className="btn btn-success flex items-center gap-2 justify-center w-full sm:w-auto"
              >
                <Download className="w-4 h-5 flex-shrink-0" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6 lg:p-8">
        {/* Runtime Authorization Guard: Filter out any unauthorized groups before rendering */}
        {(() => {
          let displayGroups = groups;
          if (isTeacher && user) {
            const unauthorizedInDisplay = groups.filter(
              (g) => g.guide_user_id !== user.id
            );
            if (unauthorizedInDisplay.length > 0) {
              console.warn(
                "SECURITY: Unauthorized groups detected in display. Filtering out."
              );
              toast.error(
                "Security breach detected: Unauthorized groups. Reloading..."
              );
              // Force reload
              setGroups([]);
              setLastLoadedAsTeacher(null);
              setTimeout(() => loadData(), 100);
              return null;
            }
          }
          return null;
        })()}
        
        {groups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Users className="w-12 sm:w-16 h-12 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-600 mb-6">
              Teacher hasn't created any group
            </p>
            {!isReadOnly && (
              <button
                onClick={() => setShowGroupManagement(true)}
                className="btn btn-primary"
              >
                Add First Group
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <table className="eval-table">
              <thead>
                <tr>
                  <th className="w-20">Group No</th>
                  <th className="w-48">Student Name</th>
                  <th className="w-48">Guide Name</th>

                  {/* Presentation 1 - Internal I Only */}
                  {isPres1 && (
                    <>
                      <th className="w-32">Problem ID (10)</th>
                      <th className="w-32">Literature (10)</th>
                      <th className="w-32">Software Eng (10)</th>
                      <th className="w-32">Req Analysis (10)</th>
                      <th className="w-32">SRS (10)</th>
                      <th className="w-28 bg-blue-50">Internal I Total (50)</th>
                    </>
                  )}

                  {/* Presentation 2 - Internal II Only */}
                  {isPres2 && (
                    <>
                      <th className="w-24">Individual (10)</th>
                      <th className="w-24">Team Work (10)</th>
                      <th className="w-24">Presentation (10)</th>
                      <th className="w-24">Paper (20)</th>
                      <th className="w-28 bg-blue-50">
                        Internal II Total (50)
                      </th>
                    </>
                  )}

                  {/* Presentation 3 - Internal III Only */}
                  {isPres3 && (
                    <>
                      <th className="w-24">Ident Module (10)</th>
                      <th className="w-24">Coding (10)</th>
                      <th className="w-24">Team Work (10)</th>
                      <th className="w-24">Understanding (10)</th>
                      <th className="w-24">Presentation (10)</th>
                      <th className="w-28 bg-blue-50">
                        Internal III Total (50)
                      </th>
                    </>
                  )}

                  {/* Presentation 4 - Internal IV Only */}
                  {isPres4 && (
                    <>
                      <th className="w-24">Testing (10)</th>
                      <th className="w-24">Participation (10)</th>
                      <th className="w-24">Publication (10)</th>
                      <th className="w-24">Project Report (20)</th>
                      <th className="w-28 bg-blue-50">
                        Internal IV Total (50)
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, groupIndex) => {
                  // Match Sibling Group
                  const sGroup = siblingGroups.find(
                    (g) => g.group_number === group.group_number,
                  );

                  return (
                    <>
                      {group.students.map((student, studentIndex) => {
                        const evaluation =
                          student.evaluation || ({} as Partial<Evaluation>);
                        // Calculate marks for CURRENT record
                        const calculated = calculateAllMarks(evaluation);

                        // Match Sibling Student
                        let sStudent = null;
                        if (sGroup) {
                          sStudent = sGroup.students.find(
                            (s) => s.student_name === student.student_name,
                          );
                          if (!sStudent && sGroup.students[studentIndex])
                            sStudent = sGroup.students[studentIndex];
                        }
                        const sEvaluation =
                          sStudent?.evaluation || ({} as Partial<Evaluation>);
                        const sCalculated = calculateAllMarks(sEvaluation);

                        const getVal = (
                          field: keyof Evaluation,
                          isOwnedByCurrent: boolean,
                        ) => {
                          if (isOwnedByCurrent) return evaluation[field] || 0;
                          return sEvaluation[field] || 0;
                        };

                        return (
                          <tr key={student.id}>
                            {studentIndex === 0 && (
                              <td
                                rowSpan={4}
                                className="text-center font-semibold bg-gray-50"
                              >
                                {group.group_number}
                              </td>
                            )}
                            <td className="font-medium">
                              {student.student_name}
                            </td>
                            {studentIndex === 0 && (
                              <td rowSpan={4} className="bg-gray-50">
                                {group.guide_name}
                              </td>
                            )}

                            {/* Presentation 1 - Internal I Only */}
                            {isPres1 && (
                              <>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={
                                      evaluation.problem_identification || 0
                                    }
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "problem_identification",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.literature_survey || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "literature_survey",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.software_engineering || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "software_engineering",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.requirement_analysis || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "requirement_analysis",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.srs || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "srs",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td className="calculated-field">
                                  {calculated.internal_presentation_i.toFixed(
                                    1,
                                  )}
                                </td>
                              </>
                            )}

                            {/* Presentation 2 - Internal II Only */}
                            {isPres2 && (
                              <>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.individual_capacity || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "individual_capacity",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.team_work || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "team_work",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.presentation_qa || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "presentation_qa",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.paper_presentation || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "paper_presentation",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td className="calculated-field">
                                  {calculated.internal_presentation_ii.toFixed(
                                    1,
                                  )}
                                </td>
                              </>
                            )}

                            {/* Presentation 3 - Internal III Only */}
                            {isPres3 && (
                              <>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={
                                      evaluation.identification_module || 0
                                    }
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "identification_module",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.coding || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "coding",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.team_work || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "team_work",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.understanding || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "understanding",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.presentation_qa || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "presentation_qa",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td className="calculated-field">
                                  {calculated.internal_presentation_iii.toFixed(
                                    1,
                                  )}
                                </td>
                              </>
                            )}

                            {/* Presentation 4 - Internal IV Only */}
                            {isPres4 && (
                              <>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.testing || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "testing",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={
                                      evaluation.participation_conference || 0
                                    }
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "participation_conference",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.publication || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "publication",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    disabled={isReadOnly}
                                    value={evaluation.project_report || 0}
                                    onChange={(e) =>
                                      handleMarkChange(
                                        student.id,
                                        "project_report",
                                        e.target.value,
                                      )
                                    }
                                    className="marks-input"
                                  />
                                </td>
                                <td className="calculated-field">
                                  {calculated.internal_presentation_iv.toFixed(
                                    1,
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Add spacer row between groups */}
                      {groupIndex < groups.length - 1 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="h-4 bg-gray-100 border-none"
                          ></td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Group Management Modal */}
      {showGroupManagement && (
        <GroupManagement
          presentationId={presentationId}
          onClose={() => {
            setShowGroupManagement(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
