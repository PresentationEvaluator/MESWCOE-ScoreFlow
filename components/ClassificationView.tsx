"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Presentation,
    GroupWithStudents,
    Evaluation,
} from "@/lib/types";
import {
    getPresentation,
    getGroupsByPresentation,
    getGroupsByPresentationForTeacher,
    updateEvaluation,
} from "@/lib/database";
import { Download, Users, ArrowLeft, LayoutDashboard } from "lucide-react";
import { exportProjectClassificationReport } from "@/lib/excelExportByPresentation";
import toast from "react-hot-toast";
import UserProfile from "./UserProfile";
import Logo from "./Logo";
import { useAuth } from "@/providers/AuthProvider";

interface ClassificationViewProps {
    presentationId: string;
}

export default function ClassificationView({
    presentationId,
}: ClassificationViewProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [groups, setGroups] = useState<GroupWithStudents[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    useEffect(() => {
        if (presentationId) {
            loadData();
        }
    }, [presentationId, user]);

    async function loadData() {
        try {
            setLoading(true);
            const pData = await getPresentation(presentationId);
            setPresentation(pData);

            const gData =
                user?.role === "teacher"
                    ? await getGroupsByPresentationForTeacher(presentationId, user.id)
                    : await getGroupsByPresentation(presentationId);
            setGroups(gData);
        } catch (error) {
            console.error("Error loading classification data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    const handleGroupFieldChange = async (
        groupId: string,
        field: keyof Evaluation,
        value: any,
    ) => {
        const group = groups.find((g) => g.id === groupId);
        if (!group) return;

        // Define classification and finance fields for mutual exclusivity
        const classificationFields = ["classification_product", "classification_research", "classification_application", "classification_design"];
        const financeFields = ["finance_institute", "finance_self", "finance_industry"];

        // If this is a checkbox being checked, uncheck others in the same section
        let updateValue = value;
        if (value && (classificationFields.includes(field as string) || financeFields.includes(field as string))) {
            // This is checking a box, so uncheck others in this section
            const fieldsToReset = classificationFields.includes(field as string) ? classificationFields : financeFields;
            
            // Optimistic update - uncheck all others in the section
            setGroups((currentGroups) =>
                currentGroups.map((g) =>
                    g.id === groupId
                        ? {
                            ...g,
                            students: g.students.map((student) => {
                                const updatedEval = { ...student.evaluation } as any;
                                // Reset all fields in this section
                                fieldsToReset.forEach((f) => {
                                    updatedEval[f] = 0;
                                });
                                // Set the current field
                                updatedEval[field] = 10;
                                return { ...student, evaluation: updatedEval };
                            }),
                        }
                        : g,
                ),
            );

            // Update database for all fields in this section
            try {
                await Promise.all(
                    group.students.map((s) => {
                        const promises: Promise<any>[] = [];
                        // Reset all other fields
                        fieldsToReset.forEach((f) => {
                            if (f !== field) {
                                promises.push(updateEvaluation(s.id, f as any, 0));
                            }
                        });
                        // Set the current field
                        promises.push(updateEvaluation(s.id, field as any, 10));
                        return Promise.all(promises);
                    }).flat(),
                );
            } catch (error) {
                console.error("Error updating group field:", error);
                toast.error("Failed to save field");
                loadData();
            }
        } else {
            // This is unchecking a box, allow it
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

            try {
                await Promise.all(
                    group.students.map((s) => updateEvaluation(s.id, field as any, value)),
                );
            } catch (error) {
                console.error("Error updating group field:", error);
                toast.error("Failed to save field");
                loadData();
            }
        }
    };

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
            toast.error("Failed to export report");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!presentation) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <Logo className="h-16 w-16" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">M.E.S. Wadia College of Engineering, Pune.</h2>
                                <p className="text-xs text-gray-600 mt-1">Project Classification Dashboard</p>
                            </div>
                        </div>
                        <UserProfile />
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Project Classification</h1>
                                <p className="text-sm text-gray-600">{presentation.name} - {presentation.semester}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(`/presentation/${presentationId}`)}
                                className="btn btn-secondary flex items-center gap-2"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Marks Dashboard
                            </button>
                            <button
                                onClick={handleExportClassification}
                                disabled={groups.length === 0}
                                className="btn bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Project Classification download
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="eval-table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th rowSpan={2} className="w-20 text-center border-b-2">Group ID</th>
                                <th rowSpan={2} className="w-48 border-b-2">Name of Student</th>
                                <th rowSpan={2} className="w-48 border-b-2">Guide Name</th>
                                <th rowSpan={2} className="w-64 border-b-2">Final Project Title</th>
                                <th rowSpan={2} className="w-40 border-b-2 text-center">In-Home/ Sponsored</th>
                                <th colSpan={4} className="text-center bg-pink-50 border-b">Classification of project</th>
                                <th colSpan={3} className="text-center bg-purple-50 border-b">Scope of Finance</th>
                            </tr>
                            <tr>
                                <th className="w-20 text-center bg-pink-50">Product</th>
                                <th className="w-20 text-center bg-pink-50">Research</th>
                                <th className="w-20 text-center bg-pink-50">Application</th>
                                <th className="w-20 text-center bg-pink-50">Design</th>
                                <th className="w-20 text-center bg-purple-50">Insti</th>
                                <th className="w-20 text-center bg-purple-50">Self</th>
                                <th className="w-20 text-center bg-purple-50">Industry</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group) => (
                                <>
                                    {group.students.map((student, studentIndex) => {
                                        const evaluation = student.evaluation || ({} as Partial<Evaluation>);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                {studentIndex === 0 && (
                                                    <td rowSpan={4} className="text-center font-bold bg-gray-50 border-r">{group.group_number}</td>
                                                )}
                                                <td className="px-4 py-2 border-r">{student.student_name}</td>
                                                {studentIndex === 0 && (
                                                    <>
                                                        <td rowSpan={4} className="px-4 py-2 bg-gray-50 border-r">{group.guide_name}</td>
                                                        <td rowSpan={4} className="p-2 border-r">
                                                            <textarea
                                                                value={evaluation.project_title || ""}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "project_title", e.target.value)}
                                                                className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[100px] resize-none"
                                                                placeholder="Enter project title..."
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="p-2 text-center border-r">
                                                            <select
                                                                value={evaluation.project_type_in_house_sponsored || ""}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "project_type_in_house_sponsored", e.target.value)}
                                                                className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary-500"
                                                            >
                                                                <option value="">Select...</option>
                                                                <option value="In-Home">In-Home</option>
                                                                <option value="Sponsored">Sponsored</option>
                                                            </select>
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-pink-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.classification_product || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "classification_product", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-pink-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.classification_research || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "classification_research", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-pink-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.classification_application || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "classification_application", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-pink-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.classification_design || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "classification_design", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-purple-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.finance_institute || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "finance_institute", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-purple-50 border-r">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.finance_self || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "finance_self", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                                            />
                                                        </td>
                                                        <td rowSpan={4} className="text-center bg-purple-50">
                                                            <input
                                                                type="checkbox"
                                                                checked={(evaluation.finance_industry || 0) > 0}
                                                                onChange={(e) => handleGroupFieldChange(group.id, "finance_industry", e.target.checked ? 10 : 0)}
                                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                                            />
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
