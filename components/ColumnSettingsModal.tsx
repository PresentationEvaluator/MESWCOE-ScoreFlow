import { useState, useEffect } from "react";
import { Presentation, CustomColumn, BaseColumnConfig } from "@/lib/types";
import { updatePresentationColumns } from "@/lib/database";
import { DEFAULT_COLUMNS } from "@/lib/constants";
import toast from "react-hot-toast";
import { X, Save, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface ColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  onSave: () => void;
}


export default function ColumnSettingsModal({
  isOpen,
  onClose,
  presentation,
  onSave,
}: ColumnSettingsModalProps) {
  const [columns, setColumns] = useState<Record<string, BaseColumnConfig>>({});
  const [extraColumns, setExtraColumns] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(false);

  // States for adding a new column
  const [newColName, setNewColName] = useState("");
  const [newColMax, setNewColMax] = useState<number>(10);

  const presentationNumber = parseInt(
    presentation.name.match(/\d+/)?.[0] || "0",
  );
  const defaultCols = DEFAULT_COLUMNS[presentationNumber] || {};

  useEffect(() => {
    if (isOpen) {
      const initialColumns: Record<string, BaseColumnConfig> = {};
      
      Object.entries(defaultCols).forEach(([key, defaultConfig]) => {
        initialColumns[key] = { 
          name: defaultConfig.name, 
          maxMark: defaultConfig.maxMark, 
          isHidden: false 
        };
        
        const saved = presentation.custom_columns?.[key];
        if (typeof saved === "string") {
          initialColumns[key].name = saved;
        } else if (saved && typeof saved === "object") {
          initialColumns[key] = { ...initialColumns[key], ...(saved as any) };
        }
      });
      
      setColumns(initialColumns);
      
      if (presentation.extra_columns) {
        setExtraColumns([...presentation.extra_columns]);
      } else {
        setExtraColumns([]);
      }
    }
  }, [isOpen, presentation, defaultCols]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updatePresentationColumns(presentation.id, columns, extraColumns);
      toast.success("Column settings updated successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update column settings");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const resetCols: Record<string, BaseColumnConfig> = {};
    Object.entries(defaultCols).forEach(([key, defaultConfig]) => {
      resetCols[key] = { 
        name: defaultConfig.name, 
        maxMark: defaultConfig.maxMark, 
        isHidden: false 
      };
    });
    setColumns(resetCols);
  };

  const handleAddExtraColumn = () => {
    if (!newColName.trim()) {
      toast.error("Column name is required");
      return;
    }
    if (newColMax <= 0 || newColMax > 100) {
      toast.error("Max mark must be between 1 and 100");
      return;
    }
    
    const newCol: CustomColumn = {
      id: `extra_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newColName.trim(),
      maxMark: newColMax,
    };
    
    setExtraColumns([...extraColumns, newCol]);
    setNewColName("");
    setNewColMax(10);
  };

  const handleRemoveExtraColumn = (id: string) => {
    setExtraColumns(extraColumns.filter((c) => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Manage Columns
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
            <div className="space-y-8">
              {/* Base Columns Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                  Base Columns
                  <span className="text-xs font-normal text-gray-500">(Hide or resize original fields)</span>
                </h4>
                <div className="space-y-4">
                  {Object.entries(columns).map(([key, config]) => (
                    <div key={key} className={`flex gap-3 items-end p-3 rounded-lg border transition-all ${config.isHidden ? "bg-gray-50 opacity-60 grayscale" : "bg-white border-gray-200"}`}>
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                          {key.replace(/_/g, " ")} Labels
                        </label>
                        <input
                          type="text"
                          value={config.name}
                          disabled={config.isHidden}
                          onChange={(e) =>
                            setColumns((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], name: e.target.value },
                            }))
                          }
                          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                          placeholder={defaultCols[key].name}
                        />
                      </div>
                      <div className="w-20">
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Max Mark</label>
                        <input
                          type="number"
                          value={config.maxMark}
                          disabled={config.isHidden}
                          onChange={(e) =>
                            setColumns((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], maxMark: parseInt(e.target.value) || 0 },
                            }))
                          }
                          className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => 
                          setColumns((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], isHidden: !prev[key].isHidden },
                          }))
                        }
                        className={`p-2 rounded-md transition-colors border ${config.isHidden ? "bg-gray-200 text-gray-600 border-gray-300" : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"}`}
                        title={config.isHidden ? "Show column" : "Hide column"}
                      >
                        {config.isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Columns Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-4">Custom Additional Columns</h4>
                
                {extraColumns.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {extraColumns.map((col, index) => (
                      <div key={col.id} className="flex gap-3 items-end bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <div className="flex-1">
                          <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Column Name</label>
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => {
                              const updated = [...extraColumns];
                              updated[index].name = e.target.value;
                              setExtraColumns(updated);
                            }}
                            className="w-full text-sm p-2 border border-purple-200 rounded-md bg-white focus:ring-1 focus:ring-purple-500"
                            placeholder="Column Name"
                          />
                        </div>
                        <div className="w-20">
                          <label className="block text-[10px] uppercase font-bold text-purple-400 mb-1">Max Mark</label>
                          <input
                            type="number"
                            value={col.maxMark}
                            onChange={(e) => {
                              const updated = [...extraColumns];
                              updated[index].maxMark = parseInt(e.target.value) || 0;
                              setExtraColumns(updated);
                            }}
                            className="w-full text-sm p-2 border border-purple-200 rounded-md bg-white focus:ring-1 focus:ring-purple-500"
                            placeholder="Max"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveExtraColumn(col.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                          title="Remove custom column"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">New Column Name</label>
                    <input
                      type="text"
                      className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Viva Voce"
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max Mark</label>
                    <input
                      type="number"
                      className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                      value={newColMax}
                      onChange={(e) => setNewColMax(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <button
                    onClick={handleAddExtraColumn}
                    className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                    title="Add extra column"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
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
