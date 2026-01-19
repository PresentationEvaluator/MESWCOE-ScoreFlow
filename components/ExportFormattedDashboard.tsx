/**
 * Example implementation: ExportFormatted Dashboard Component
 *
 * This component demonstrates how to integrate the formatted Excel export
 * functionality into your application UI.
 *
 * Features:
 * - Export individual presentations
 * - Export all presentations separately
 * - Export combined semesters
 * - Export complete annual report
 */

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  exportPresentationSeparatelyFormatted,
  exportAllPresentationsSeparatelyFormatted,
  exportSemester1CombinedFormatted,
  exportSemester2CombinedFormatted,
  exportAnnualReportFormattedAndSeparated,
} from "@/lib/excelExportFormatted";
import Logo from "./Logo";
import { useAuth } from "@/providers/AuthProvider";
import UserProfile from "./UserProfile";

interface ExportFormattedDashboardProps {
  academicYearId: string;
  academicYearName: string;
}

export default function ExportFormattedDashboard({
  academicYearId,
  academicYearName,
}: ExportFormattedDashboardProps) {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Single Presentation Export
  const handleExportPresentation = async (
    presentationId: string,
    presentationName: string,
  ) => {
    setIsExporting(true);
    try {
      await exportPresentationSeparatelyFormatted(
        academicYearId,
        presentationId,
        presentationName,        user?.id,
        (user as any)?.role,      );
      toast.success(`${presentationName} exported successfully!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export ${presentationName}`);
    } finally {
      setIsExporting(false);
    }
  };

  // All Presentations Separated (4 sheets)
  const handleExportAllSeparated = async () => {
    setIsExporting(true);
    try {
      await exportAllPresentationsSeparatelyFormatted(academicYearId, user?.id, (user as any)?.role);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export presentations");
    } finally {
      setIsExporting(false);
    }
  };

  // Semester 1 Combined
  const handleExportSemester1 = async () => {
    setIsExporting(true);
    try {
      await exportSemester1CombinedFormatted(academicYearId, user?.id, (user as any)?.role);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Semester 1");
    } finally {
      setIsExporting(false);
    }
  };

  // Semester 2 Combined
  const handleExportSemester2 = async () => {
    setIsExporting(true);
    try {
      await exportSemester2CombinedFormatted(academicYearId, user?.id, (user as any)?.role);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Semester 2");
    } finally {
      setIsExporting(false);
    }
  };

  // Annual Report (All Presentations Separated & Formatted)
  const handleExportAnnualReport = async () => {
    setIsExporting(true);
    try {
      await exportAnnualReportFormattedAndSeparated(academicYearId, user?.id, (user as any)?.role);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export annual report");
    } finally {
      setIsExporting(false);
    }
  };

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

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Formatted Excel Export</h1>
                <p className="text-sm text-gray-600 mt-1">{academicYearName} - Professional Reports with Separated Presentations</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Features Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            ✨ Export Features
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Solid black borders on all cells</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Center alignment (horizontal & vertical)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Text wrapping for long content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Separate sheets per presentation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Bold header rows</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">✓</span>
              <span>Optimized column widths</span>
            </li>
          </ul>
        </div>

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recommended - Annual Report */}
          <div className="lg:col-span-2 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-900 mb-2">
                  ⭐ Recommended: Annual Report (All Presentations Separated)
                </h3>
                <p className="text-green-800 mb-4">
                  Export all presentations (P1, P2, P3, P4) into one workbook
                  with 4 separate sheets. Each presentation is isolated for easy
                  analysis. Full professional formatting applied throughout.
                </p>
                <div className="text-sm text-green-700 mb-4">
                  <p className="font-semibold mb-2">Output Format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Sheet 1: Presentation 1 (only)</li>
                    <li>Sheet 2: Presentation 2 (only)</li>
                    <li>Sheet 3: Presentation 3 (only)</li>
                    <li>Sheet 4: Presentation 4 (only)</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleExportAnnualReport}
                disabled={isExporting}
                className="btn btn-success flex items-center gap-2 whitespace-nowrap ml-4"
              >
                <Download className="w-5 h-5" />
                {isExporting ? "Exporting..." : "Export Report"}
              </button>
            </div>
          </div>

          {/* Individual Presentations */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Individual Presentations
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Export single presentations with full formatting. Perfect for
              sharing or detailed analysis of one presentation.
            </p>
            <div className="space-y-2">
              <button
                onClick={() =>
                  handleExportPresentation(
                    "presentation-1-id",
                    "Presentation 1",
                  )
                }
                disabled={isExporting}
                className="btn btn-secondary w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Export Presentation 1
              </button>
              <button
                onClick={() =>
                  handleExportPresentation(
                    "presentation-2-id",
                    "Presentation 2",
                  )
                }
                disabled={isExporting}
                className="btn btn-secondary w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Export Presentation 2
              </button>
              <button
                onClick={() =>
                  handleExportPresentation(
                    "presentation-3-id",
                    "Presentation 3",
                  )
                }
                disabled={isExporting}
                className="btn btn-secondary w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Export Presentation 3
              </button>
              <button
                onClick={() =>
                  handleExportPresentation(
                    "presentation-4-id",
                    "Presentation 4",
                  )
                }
                disabled={isExporting}
                className="btn btn-secondary w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Export Presentation 4
              </button>
            </div>
          </div>

          {/* All Presentations Separated */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              All Presentations (4 Sheets)
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Export all presentations into one workbook with each presentation
              in a separate sheet. Ideal for comprehensive review.
            </p>
            <button
              onClick={handleExportAllSeparated}
              disabled={isExporting}
              className="btn btn-primary w-full flex items-center gap-2 justify-center"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export All Presentations"}
            </button>
          </div>

          {/* Semester Exports */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Semester Reports
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Export combined semester reports. Presentations 1&2 for Semester
              1, Presentations 3&4 for Semester 2.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleExportSemester1}
                disabled={isExporting}
                className="btn btn-outline w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Semester 1 (P1 + P2)
              </button>
              <button
                onClick={handleExportSemester2}
                disabled={isExporting}
                className="btn btn-outline w-full flex items-center gap-2 justify-center"
              >
                <Download className="w-4 h-4" />
                Semester 2 (P3 + P4)
              </button>
            </div>
          </div>

          {/* Formatting Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Applied Formatting
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Borders</p>
                <p className="text-gray-600">
                  Solid black borders on all cells
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Alignment</p>
                <p className="text-gray-600">Center (horizontal & vertical)</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Text Wrapping</p>
                <p className="text-gray-600">Enabled for all cells</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Headers</p>
                <p className="text-gray-600">Bold with 30px height</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Columns</p>
                <p className="text-gray-600">Optimized widths per content</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Usage Guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                For Administrators
              </h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Click "Export Report" for the complete annual report</li>
                <li>
                  Receive one Excel file with 4 separate presentation sheets
                </li>
                <li>Share directly with stakeholders or administrators</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                For Individual Reviews
              </h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Click any individual presentation to export</li>
                <li>Get isolated data for focused analysis</li>
                <li>Perfect for one-on-one reviews with guides</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        {isExporting && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-blue-700">Generating formatted Excel file...</p>
          </div>
        )}
      </main>
    </div>
  );
}
