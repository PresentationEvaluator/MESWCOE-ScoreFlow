'use client';

import { useState, useEffect } from 'react';
import { Group, Presentation, User } from '@/lib/types';
import {
    createGroup,
    deleteGroup,
    updateGroupGuide,
    updateStudentName,
    duplicateGroup,
    getGroupsByPresentation,
    getAllPresentations,
    copyGroupsFromPresentation,
    normalizeGroupNumbers
} from '@/lib/database';
import { getAllTeachers } from '@/lib/auth';
import { useAuth } from '@/providers/AuthProvider';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, Edit2, Copy } from 'lucide-react';

interface GroupManagementProps {
    presentationId: string;
    onClose: () => void;
}

export default function GroupManagement({ presentationId, onClose }: GroupManagementProps) {
    const { user, isAdmin, isTeacher } = useAuth();
    const [groups, setGroups] = useState<any[]>([]);
    const [presentations, setPresentations] = useState<Presentation[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [editingStudent, setEditingStudent] = useState<string | null>(null);

    // For admin creating group
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copySourceId, setCopySourceId] = useState('');
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        loadData();
    }, [user, isAdmin, isTeacher]);

    async function loadData() {
        try {
            let [groupsData, presentationsData, teachersData] = await Promise.all([
                getGroupsByPresentation(presentationId),
                getAllPresentations(),
                isAdmin ? getAllTeachers() : Promise.resolve([]),
            ]);

            // Normalize automatically if numbers are out-of-order
            if (Array.isArray(groupsData) && groupsData.length > 0) {
                const needsNormalize = groupsData.some((g: any, i: number) => g.group_number !== i + 1);
                if (needsNormalize) {
                    await normalizeGroupNumbers(presentationId);
                    toast.success('Normalized group numbers');
                    groupsData = await getGroupsByPresentation(presentationId);
                }
            }

            setGroups(groupsData);
            setPresentations(presentationsData);
            setTeachers(teachersData);

            // Set default selected teacher if admin
            if (isAdmin && teachersData.length > 0 && !selectedTeacherId) {
                setSelectedTeacherId(teachersData[0].id);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load groups');
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
            formData.get('student1') as string,
            formData.get('student2') as string,
            formData.get('student3') as string,
            formData.get('student4') as string,
        ];

        // Validate all students have names
        if (students.some(name => !name.trim())) {
            toast.error('All 4 student names are required');
            return;
        }

        try {
            const nextGroupNumber = groups.length > 0
                ? Math.max(...groups.map(g => g.group_number)) + 1
                : 1;

            let guideName = formData.get('guide_name') as string;
            let guideUserId = undefined;

            if (isAdmin && selectedTeacherId) {
                const teacher = teachers.find(t => t.id === selectedTeacherId);
                if (teacher) {
                    guideName = teacher.full_name || teacher.username;
                    guideUserId = teacher.id;
                }
            }

            await createGroup({
                presentation_id: presentationId,
                group_number: nextGroupNumber,
                guide_name: guideName,
                guide_user_id: guideUserId,
                students,
            }, user?.id, user?.role);

            toast.success('Group created successfully');
            setShowCreateForm(false);
            loadData();
        } catch (error) {
            console.error('Error creating group:', error);
            toast.error((error as any)?.message || String(error) || 'Failed to create group');
        }
    }

    async function handleDeleteGroup(groupId: string, groupNumber: number) {
        if (!confirm(`Delete Group ${groupNumber}? This will delete all students and their evaluation marks.`)) {
            return;
        }

        try {
            await deleteGroup(groupId);
            toast.success('Group deleted successfully');
            loadData();
        } catch (error) {
            console.error('Error deleting group:', error);
            toast.error('Failed to delete group');
        }
    }

    async function handleUpdateGuide(groupId: string, newGuideName: string, guideUserId?: string) {
        try {
            await updateGroupGuide(groupId, newGuideName, guideUserId);
            toast.success('Guide updated');
            setEditingGroup(null);
            loadData();
        } catch (error) {
            console.error('Error updating guide:', error);
            toast.error('Failed to update guide');
        }
    }

    async function handleUpdateStudent(studentId: string, newName: string) {
        try {
            await updateStudentName(studentId, newName);
            toast.success('Student name updated');
            setEditingStudent(null);
            loadData();
        } catch (error) {
            console.error('Error updating student:', error);
            toast.error('Failed to update student name');
        }
    }

    async function handleDuplicateGroup(groupId: string, targetPresentationId: string) {
        try {
            await duplicateGroup(groupId, targetPresentationId);
            toast.success('Group duplicated successfully');
            if (targetPresentationId === presentationId) {
                loadData();
            }
        } catch (error) {
            console.error('Error duplicating group:', error);
            toast.error('Failed to duplicate group');
        }
    }

    async function handleCopyGroups() {
        if (!copySourceId) {
            toast.error('Please select a presentation to copy from');
            return;
        }

        try {
            setIsCopying(true);
            const count = await copyGroupsFromPresentation(copySourceId, presentationId);
            toast.success(`Successfully copied ${count} groups`);
            setShowCopyModal(false);
            setCopySourceId('');
            // Normalize numbers after copy
            await normalizeGroupNumbers(presentationId);
            loadData();
        } catch (error) {
            console.error('Error copying groups:', error);
            toast.error((error as any)?.message || 'Failed to copy groups');
        } finally {
            setIsCopying(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Manage Groups</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Action Buttons */}
                    {!showCreateForm && !showCopyModal && (
                        <div className="flex gap-4 mb-6">
                            {!isAdmin && (
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add New Group
                                </button>
                            )}
                            <button
                                onClick={() => setShowCopyModal(true)}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <Copy className="w-5 h-5" />
                                Copy Groups from Presentation
                            </button>
                        </div>
                    )}

                    {/* Copy Groups Modal Section */}
                    {showCopyModal && (
                        <div className="card mb-6 bg-purple-50 border-purple-200">
                            <h3 className="text-lg font-semibold mb-4">Copy Groups from Other Presentation</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                This will copy all groups and students from the selected presentation to the current one.
                                New groups will be added with sequential numbers.
                            </p>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="form-label">Source Presentation</label>
                                    <select
                                        value={copySourceId}
                                        onChange={(e) => setCopySourceId(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="">Select a presentation...</option>
                                        {presentations
                                            .filter(p => p.id !== presentationId)
                                            .map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowCopyModal(false)}
                                        className="btn btn-secondary"
                                        disabled={isCopying}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCopyGroups}
                                        className="btn btn-primary"
                                        disabled={isCopying || !copySourceId}
                                    >
                                        {isCopying ? 'Copying...' : 'Copy Groups'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create Group Form */}
                    {showCreateForm && (
                        <div className="card mb-6 bg-blue-50 border-blue-200">
                            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
                            <form onSubmit={handleCreateGroup}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="form-label">Guide *</label>
                                        {isAdmin ? (
                                            <select
                                                className="form-select"
                                                value={selectedTeacherId}
                                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                                required
                                            >
                                                <option value="">Select a teacher...</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.full_name || t.username}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                name="guide_name"
                                                required
                                                defaultValue={user?.full_name || ''}
                                                placeholder="Enter guide name"
                                                className="form-input"
                                            />
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="form-label">Student 1 *</label>
                                            <input
                                                type="text"
                                                name="student1"
                                                required
                                                placeholder="Enter student name"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Student 2 *</label>
                                            <input
                                                type="text"
                                                name="student2"
                                                required
                                                placeholder="Enter student name"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Student 3 *</label>
                                            <input
                                                type="text"
                                                name="student3"
                                                required
                                                placeholder="Enter student name"
                                                className="form-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Student 4 *</label>
                                            <input
                                                type="text"
                                                name="student4"
                                                required
                                                placeholder="Enter student name"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Groups List */}
                    <div className="space-y-4">
                        {groups.length === 0 ? (
                            <p className="text-center text-gray-600 py-8">No groups yet. Create your first group or copy from another presentation.</p>
                        ) : (
                            groups.map((group) => (
                                <div key={group.id} className="card">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Group {group.group_number}
                                            </h3>
                                            <div className="mt-2">
                                                {editingGroup === group.id ? (
                                                    <div className="flex items-center gap-2">
                                                        {isAdmin ? (
                                                            <select
                                                                className="form-select"
                                                                defaultValue={group.guide_user_id || ''}
                                                                onChange={(e) => {
                                                                    const teacherId = e.target.value;
                                                                    const teacher = teachers.find(t => t.id === teacherId);
                                                                    if (teacher) {
                                                                        handleUpdateGuide(group.id, teacher.full_name || teacher.username, teacher.id);
                                                                    }
                                                                }}
                                                                onBlur={() => setEditingGroup(null)}
                                                                autoFocus
                                                            >
                                                                <option value="">Select a teacher...</option>
                                                                {teachers.map(t => (
                                                                    <option key={t.id} value={t.id}>
                                                                        {t.full_name || t.username}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                defaultValue={group.guide_name}
                                                                onBlur={(e) => handleUpdateGuide(group.id, e.target.value, group.guide_user_id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleUpdateGuide(group.id, e.currentTarget.value, group.guide_user_id);
                                                                    }
                                                                }}
                                                                className="form-input"
                                                                autoFocus
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600">Guide: {group.guide_name}</span>
                                                        <button
                                                            onClick={() => setEditingGroup(group.id)}
                                                            className="text-primary-600 hover:text-primary-700 p-1"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleDuplicateGroup(group.id, e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="form-select text-sm"
                                            >
                                                <option value="">Duplicate to...</option>
                                                {presentations
                                                    .filter(p => p.id !== presentationId)
                                                    .map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                            </select>
                                            <button
                                                onClick={() => handleDeleteGroup(group.id, group.group_number)}
                                                className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Students */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {group.students.map((student: any, index: number) => (
                                            <div key={student.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                <span className="text-sm font-medium text-gray-700 w-20">
                                                    Student {index + 1}:
                                                </span>
                                                {editingStudent === student.id ? (
                                                    <input
                                                        type="text"
                                                        defaultValue={student.student_name}
                                                        onBlur={(e) => handleUpdateStudent(student.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateStudent(student.id, e.currentTarget.value);
                                                            }
                                                        }}
                                                        className="form-input flex-1"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="text-sm flex-1">{student.student_name}</span>
                                                        <button
                                                            onClick={() => setEditingStudent(student.id)}
                                                            className="text-primary-600 hover:text-primary-700 p-1"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </>
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
