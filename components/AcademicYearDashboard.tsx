"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicYear } from "@/lib/types";
import {
  getAllAcademicYears,
  createAcademicYear,
  deleteAcademicYear,
  getPresentationsByAcademicYear,
  updateAcademicYear,
} from "@/lib/database";
import { exportAnnualReport } from "@/lib/excelExportAnnual";
import { useAuth } from "@/providers/AuthProvider";
import toast from "react-hot-toast";
import UserProfile from "./UserProfile";
import Logo from "./Logo";
import {
  Plus,
  Calendar,
  FileSpreadsheet,
  Trash2,
  Edit,
  Download,
  ArrowLeft,
} from "lucide-react";

export default function AcademicYearDashboard() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [presentationCounts, setPresentationCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    loadAcademicYears();
  }, []);

  async function loadAcademicYears() {
    try {
      const data = await getAllAcademicYears();
      setAcademicYears(data);

      // Load presentation counts for each academic year
      const counts: Record<string, number> = {};
      for (const year of data) {
        const presentations = await getPresentationsByAcademicYear(year.id);
        counts[year.id] = presentations.length;
      }
      setPresentationCounts(counts);
    } catch (error) {
      console.error("Error loading academic years:", error);
      toast.error("Failed to load academic years");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAcademicYear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!isAdmin) {
      toast.error("Only admins can create academic years");
      return;
    }

    const formData = new FormData(e.currentTarget);

    try {
      const newAcademicYear = await createAcademicYear({
        start_year: parseInt(formData.get("start_year") as string),
        end_year: parseInt(formData.get("end_year") as string),
      });

      toast.success("Academic year created successfully");
      setShowCreateModal(false);
      loadAcademicYears();
    } catch (error) {
      console.error("Error creating academic year:", error);
      toast.error((error as any)?.message || "Failed to create academic year");
    }
  }

  async function handleDeleteAcademicYear(id: string, name: string) {
    if (!isAdmin) {
      toast.error("Only admins can delete academic years");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This will delete all presentations, groups, students, and evaluations within this academic year.`,
      )
    ) {
      return;
    }

    try {
      await deleteAcademicYear(id);
      toast.success("Academic year deleted successfully");
      loadAcademicYears();
    } catch (error) {
      console.error("Error deleting academic year:", error);
      toast.error("Failed to delete academic year");
    }
  }

  async function handleEditAcademicYear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingYear) return;

    if (!isAdmin) {
      toast.error("Only admins can edit academic years");
      return;
    }

    const formData = new FormData(e.currentTarget);

    try {
      await updateAcademicYear(editingYear.id, {
        start_year: parseInt(formData.get("start_year") as string),
        end_year: parseInt(formData.get("end_year") as string),
      });

      toast.success("Academic year updated successfully");
      setShowEditModal(false);
      setEditingYear(null);
      loadAcademicYears();
    } catch (error) {
      console.error("Error updating academic year:", error);
      toast.error("Failed to update academic year");
    }
  }

  function openEditModal(year: AcademicYear) {
    setEditingYear(year);
    setShowEditModal(true);
  }

  async function handleExportAnnualReport(yearId: string) {
    try {
      toast.loading("Generating Annual Report...");
      await exportAnnualReport(yearId);
      toast.dismiss();
      toast.success("Annual Report downloaded successfully");
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting Annual Report:", error);
      toast.error("Failed to export Annual Report");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading academic years...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
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
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Academic Years
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage academic years and their presentations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!isAdmin}
                title={!isAdmin ? "Only admins can create academic years" : ""}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                New Academic Year
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {academicYears.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No academic years yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first academic year
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!isAdmin}
              title={!isAdmin ? "Only admins can create academic years" : ""}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Academic Year
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {academicYears.map((year) => (
              <div
                key={year.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {year.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {year.start_year} - {year.end_year}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(year)}
                          className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit academic year"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteAcademicYear(year.id, year.name)
                          }
                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete academic year"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{presentationCounts[year.id] || 0} Presentations</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/academic-years/${year.id}`)}
                    className="btn btn-primary flex-1"
                  >
                    View Presentations
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Academic Year Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create New Academic Year
            </h2>
            <form onSubmit={handleCreateAcademicYear}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="start_year" className="form-label">
                    Start Year *
                  </label>
                  <input
                    type="number"
                    id="start_year"
                    name="start_year"
                    required
                    placeholder="e.g., 2023"
                    min="2000"
                    max="2100"
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="end_year" className="form-label">
                    End Year *
                  </label>
                  <input
                    type="number"
                    id="end_year"
                    name="end_year"
                    required
                    placeholder="e.g., 2024"
                    min="2000"
                    max="2100"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Academic Year Modal */}
      {showEditModal && editingYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Edit Academic Year
            </h2>
            <form onSubmit={handleEditAcademicYear}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit_start_year" className="form-label">
                    Start Year *
                  </label>
                  <input
                    type="number"
                    id="edit_start_year"
                    name="start_year"
                    required
                    defaultValue={editingYear.start_year}
                    min="2000"
                    max="2100"
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="edit_end_year" className="form-label">
                    End Year *
                  </label>
                  <input
                    type="number"
                    id="edit_end_year"
                    name="end_year"
                    required
                    defaultValue={editingYear.end_year}
                    min="2000"
                    max="2100"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingYear(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
