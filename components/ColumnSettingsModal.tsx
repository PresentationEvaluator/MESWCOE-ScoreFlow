import { useState, useEffect } from "react";
import { Presentation } from "@/lib/types";
import { updatePresentationColumns } from "@/lib/database";
import toast from "react-hot-toast";
import { X, Save } from "lucide-react";

interface ColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  onSave: () => void;
}

const DEFAULT_COLUMNS: Record<number, Record<string, string>> = {
  1: {
    problem_identification: "Problem ID (10)",
    literature_survey: "Literature (10)",
    software_engineering: "Software Eng (10)",
    requirement_analysis: "Req Analysis (10)",
    srs: "SRS (10)",
  },
  2: {
    individual_capacity: "Individual (10)",
    team_work: "Team Work (10)",
    presentation_qa: "Presentation (10)",
    paper_presentation: "Paper (20)",
  },
  3: {
    identification_module: "Ident Module (10)",
    coding: "Coding (10)",
    team_work: "Team Work (10)",
    understanding: "Understanding (10)",
    internal_presentation_iii: "Presentation (10)",
  },
  4: {
    testing: "Testing (10)",
    participation_conference: "Participation (10)",
    publication: "Publication (10)",
    project_report: "Project Report (20)",
  },
};

export default function ColumnSettingsModal({
  isOpen,
  onClose,
  presentation,
  onSave,
}: ColumnSettingsModalProps) {
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const presentationNumber = parseInt(
    presentation.name.match(/\d+/)?.[0] || "0"
  );
  const defaultCols = DEFAULT_COLUMNS[presentationNumber] || {};

  useEffect(() => {
    if (isOpen) {
      const initialColumns = { ...defaultCols };
      // Merge in any custom columns already saved
      if (presentation.custom_columns) {
        Object.keys(presentation.custom_columns).forEach((key) => {
          if (key in initialColumns) {
            initialColumns[key] = presentation.custom_columns![key];
          }
        });
      }
      setColumns(initialColumns);
    }
  }, [isOpen, presentation]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      // Merge new columns with existing ones (in case other properties were stored)
      const newCustomColumns = {
        ...(presentation.custom_columns || {}),
        ...columns,
      };

      await updatePresentationColumns(presentation.id, newCustomColumns);
      toast.success("Column names updated successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update column names");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setColumns({ ...defaultCols });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Edit Column Names
            </h3>
            <p className="text-sm text-gray-500">{presentation.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {Object.keys(defaultCols).length === 0 ? (
            <p className="text-gray-500">
              No editable columns available for this presentation type.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(columns).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setColumns((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={defaultCols[key]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            type="button"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || Object.keys(defaultCols).length === 0}
              className="btn btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
