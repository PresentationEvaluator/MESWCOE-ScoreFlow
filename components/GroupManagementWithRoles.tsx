"use client";

import { useState, useEffect } from "react";
import { Group, Presentation, User } from "@/lib/types";
import {
  createGroup,
  deleteGroup,
  updateGroupGuide,
  updateStudentName,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
  getAllPresentations,
  normalizeGroupNumbers,
  getPresentation,
  getPresentationsWithGroupsForTeacher,
} from "@/lib/database";
import { getAllTeachers } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";
import toast from "react-hot-toast";
import { X, Plus, Trash2, Users } from "lucide-react";

interface GroupManagementProps {
  presentationId: string;
  onClose: () => void;
}

export default function GroupManagement({
  presentationId,
  onClose,
}: GroupManagementProps) {
  const { user, isAdmin, isTeacher } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [guideSearchInput, setGuideSearchInput] = useState("");
  const [showGuideDropdown, setShowGuideDropdown] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-guide-dropdown]')) {
        setShowGuideDropdown(false);
      }
    };

    if (showGuideDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showGuideDropdown]);

  async function loadData() {
    try {
      let groupsData;
      // Teachers see only their groups
      if (isTeacher && user) {
        groupsData = await getGroupsByPresentationForTeacher(
          presentationId,
          user.id,
        );
      } else {
        // Admins see all groups
        groupsData = await getGroupsByPresentation(presentationId);
      }

      // First get the current presentation to know the academic year
      const currentPres = await getPresentation(presentationId);

      const [presentationsData, teachersData] = await Promise.all([
        isTeacher && user
          ? getPresentationsWithGroupsForTeacher(currentPres.academic_year_id, user.id)
          : getAllPresentations(),
        getAllTeachers(),
      ]);

      // If group numbers are not sequential starting at 1, normalize them and reload
      if (Array.isArray(groupsData) && groupsData.length > 0) {
        const needsNormalize = groupsData.some((g: any, i: number) => g.group_number !== i + 1);
        if (needsNormalize) {
          await normalizeGroupNumbers(presentationId);
          toast.success('Normalized group numbers');
          // Re-fetch groups after normalization
          groupsData = isTeacher && user
            ? await getGroupsByPresentationForTeacher(presentationId, user.id)
            : await getGroupsByPresentation(presentationId);
        }
      }

      setGroups(groupsData);
      setPresentations(presentationsData);
      setCurrentPresentation(currentPres);
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load groups");
    }
  }

  async function handleCreateGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isAdmin) {
      toast.error('Admins cannot create groups directly');
      return;
    }

    const formData = new FormData(e.currentTarget);

    const students = [
      formData.get("student1") as string,
      formData.get("student2") as string,
      formData.get("student3") as string,
      formData.get("student4") as string,
    ].filter((name) => name.trim()); // Remove empty names

    // Validate at least 3 students
    if (students.length < 3) {
      toast.error("At least 3 student names are required");
      return;
    }

    // For teachers, guide_name is auto-filled. For admins, it's required.
    const guideName =
      isTeacher && user
        ? user.full_name || user.username
        : (formData.get("guide_name") as string);

    if (!guideName || !guideName.trim()) {
      toast.error("Guide name is required");
      return;
    }

    try {
      // Prevent duplicate submissions on multiple clicks
      if (isCreatingGroup) {
        toast.error("Group creation in progress... please wait");
        return;
      }

      setIsCreatingGroup(true);

      const nextGroupNumber =
        groups.length > 0
          ? Math.max(...groups.map((g) => g.group_number)) + 1
          : 1;

      await createGroup(
        {
          presentation_id: presentationId,
          group_number: nextGroupNumber,
          guide_name: guideName,
          guide_user_id: selectedGuideId || undefined,
          students,
        },
        user?.id,
        user?.role,
      );

      toast.success("Group created successfully");
      setShowCreateForm(false);
      setGuideSearchInput("");
      setSelectedGuideId("");
      setShowGuideDropdown(false);
      await loadData();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error((error as any)?.message || String(error) || "Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: string, groupNumber: number) {
    const isPresentation1 = currentPresentation?.name.endsWith("1");
    const deleteMessage = isPresentation1
      ? `Delete Group ${groupNumber}? This will also delete this group from Presentations 2, 3, and 4 in the same academic year, along with all students and their evaluation marks.`
      : `Delete Group ${groupNumber}? This will delete all students and their evaluation marks.`;

    if (!confirm(deleteMessage)) {
      return;
    }

    try {
      await deleteGroup(groupId);
      const cascadeMessage = isPresentation1
        ? "Group and cascade deleted successfully"
        : "Group deleted successfully";
      toast.success(cascadeMessage);
      loadData();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  }

  async function handleUpdateGuide(groupId: string, newGuideName: string) {
    try {
      await updateGroupGuide(groupId, newGuideName);
      toast.success("Guide name updated");
      setEditingGroup(null);
      loadData();
    } catch (error) {
      console.error("Error updating guide:", error);
      toast.error("Failed to update guide name");
    }
  }

  async function handleUpdateStudent(studentId: string, newName: string) {
    try {
      await updateStudentName(studentId, newName);
      toast.success("Student name updated");
      setEditingStudent(null);
      loadData();
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Failed to update student name");
    }
  }



  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.full_name || teacher.username}` : "Unknown";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Groups</h2>
            {isTeacher && <p className="text-sm text-gray-600">Your Groups</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Action Buttons */}
          {!showCreateForm && (
            <div className="flex gap-4 mb-6 flex-wrap">
              {!isAdmin && (
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setGuideSearchInput("");
                    setShowGuideDropdown(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add New Group
                </button>
              )}

            </div>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Create New Group
              </h3>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                {/* For Teachers: Show guide name info */}
                {isTeacher && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Guide Name:</span>{" "}
                      Automatically set to{" "}
                      <strong>{user?.full_name || user?.username}</strong>
                    </p>
                  </div>
                )}

                {/* For Admins: Guide Selection */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guide Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" data-guide-dropdown>
                      <input
                        type="text"
                        placeholder="Search and select guide..."
                        value={guideSearchInput}
                        onChange={(e) => {
                          setGuideSearchInput(e.target.value);
                          setSelectedGuideId(""); // clear any prior selection when typing a custom name
                          setShowGuideDropdown(true);
                        }}
                        onFocus={() => setShowGuideDropdown(true)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      
                      {/* Hidden input to hold the selected guide name for form submission */}
                      <input
                        name="guide_name"
                        type="hidden"
                        value={guideSearchInput}
                      />

                      {/* Dropdown Menu */}
                      {showGuideDropdown && teachers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                          {teachers
                            .filter((teacher) => {
                              const searchLower = guideSearchInput.toLowerCase();
                              const fullName = (teacher.full_name || "").toLowerCase();
                              const username = teacher.username.toLowerCase();
                              return (
                                fullName.includes(searchLower) ||
                                username.includes(searchLower)
                              );
                            })
                            .map((teacher) => (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => {
                                  setGuideSearchInput(
                                    teacher.full_name || teacher.username
                                  );
                                  setSelectedGuideId(teacher.id); // remember the selected teacher id so group is visible to them
                                  setShowGuideDropdown(false);
                                }}
                                
                                className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-gray-900">
                                  {teacher.full_name || teacher.username}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {teacher.email}
                                </div>
                              </button>
                            ))}
                          {teachers.filter((teacher) => {
                            const searchLower = guideSearchInput.toLowerCase();
                            const fullName = (teacher.full_name || "").toLowerCase();
                            const username = teacher.username.toLowerCase();
                            return (
                              fullName.includes(searchLower) ||
                              username.includes(searchLower)
                            );
                          }).length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No teachers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Student Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student {i} {i <= 3 && <span className="text-red-500">*</span>} {i === 4 && <span className="text-gray-500 text-xs">(optional)</span>}
                      </label>
                      <input
                        name={`student${i}`}
                        type="text"
                        placeholder={`Student ${i} name`}
                        required={i <= 3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isCreatingGroup}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                  >
                    {isCreatingGroup ? "Creating..." : "Create Group"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setGuideSearchInput("");
                      setShowGuideDropdown(false);
                    }}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Groups List */}
          <div className="space-y-4">
            {groups.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">
                  {isTeacher ? "You have no groups yet" : "No groups found"}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded">
                        Group {group.group_number}
                      </div>
                      <div>
                        {editingGroup === group.id ? (
                          <input
                            type="text"
                            defaultValue={group.guide_name}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                handleUpdateGuide(group.id, e.target.value);
                              }
                              setEditingGroup(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            autoFocus
                            className="px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-gray-700">
                            Guide:{" "}
                            <span className="font-semibold">
                              {group.guide_name}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleDeleteGroup(group.id, group.group_number)
                        }
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Students */}
                  <div className="space-y-2">
                    {group.students.map((student: any, index: number) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-2 ml-4"
                      >
                        <span className="text-gray-500 font-medium w-8">
                          S{index + 1}:
                        </span>
                        {editingStudent === student.id ? (
                          <input
                            type="text"
                            defaultValue={student.student_name}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                handleUpdateStudent(student.id, e.target.value);
                              }
                              setEditingStudent(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingStudent(student.id)}
                            className="flex-1 px-2 py-1 text-gray-700 cursor-pointer hover:bg-gray-100 rounded transition-colors"
                          >
                            {student.student_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
