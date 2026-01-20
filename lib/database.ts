import { supabase } from "./supabase";
import {
  AcademicYear,
  Presentation,
  Group,
  Student,
  Evaluation,
  CreateAcademicYearInput,
  CreatePresentationInput,
  CreateGroupInput,
  GroupWithStudents,
  StudentWithEvaluation,
  PresentationWithGroups,
} from "./types";

// =====================================================
// Academic Year Operations
// =====================================================

export async function createAcademicYear(
  input: CreateAcademicYearInput,
): Promise<AcademicYear> {
  // Check if an academic year with same start_year and end_year already exists
  const { data: existingYears, error: checkError } = await supabase
    .from("academic_years")
    .select("*")
    .eq("start_year", input.start_year)
    .eq("end_year", input.end_year);

  if (checkError) throw checkError;
  if (existingYears && existingYears.length > 0) {
    throw new Error(`Academic year ${input.start_year}-${input.end_year} already exists`);
  }

  // Generate name from years
  const name = `${input.start_year}-${input.end_year}`;

  const { data, error } = await supabase
    .from("academic_years")
    .insert([{ name, ...input }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAllAcademicYears(): Promise<AcademicYear[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .order("start_year", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAcademicYear(id: string): Promise<AcademicYear> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateAcademicYear(
  id: string,
  input: Partial<CreateAcademicYearInput>,
): Promise<AcademicYear> {
  const { data, error } = await supabase
    .from("academic_years")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAcademicYear(id: string): Promise<void> {
  const { error } = await supabase.from("academic_years").delete().eq("id", id);

  if (error) throw error;
}

// =====================================================
// Presentation Operations
// =====================================================

export async function createPresentation(
  input: CreatePresentationInput,
): Promise<Presentation> {
  const { data, error } = await supabase
    .from("presentations")
    .insert([input])
    .select()
    .single();

  if (error) throw error;

  // Auto-copy groups from Presentation 1 if this is P2, P3, or P4
  const isP2P3P4 = input.name.match(/[234]$/);
  if (isP2P3P4) {
    try {
      // Find Presentation 1 in the same academic year
      const { data: p1 } = await supabase
        .from("presentations")
        .select("id")
        .eq("academic_year_id", input.academic_year_id)
        .eq("name", input.name.replace(/[234]$/, "1"))
        .single();

      if (p1) {
        // Copy all groups from P1 to this new presentation
        const { data: p1Groups } = await supabase
          .from("groups")
          .select("*")
          .eq("presentation_id", p1.id);

        if (p1Groups && p1Groups.length > 0) {
          // Create groups with the same number and guide
          for (const p1Group of p1Groups) {
            // Create group in new presentation
            const newGroup = {
              presentation_id: data.id,
              group_number: p1Group.group_number,
              guide_name: p1Group.guide_name,
              guide_user_id: p1Group.guide_user_id,
            };

            const { data: createdGroup } = await supabase
              .from("groups")
              .insert([newGroup])
              .select()
              .single();

            if (createdGroup) {
              // Copy all students from P1 group
              const { data: p1Students } = await supabase
                .from("students")
                .select("*")
                .eq("group_id", p1Group.id);

              if (p1Students && p1Students.length > 0) {
                const studentsToCopy = p1Students.map((s) => ({
                  group_id: createdGroup.id,
                  student_name: s.student_name,
                  position: s.position,
                }));

                await supabase.from("students").insert(studentsToCopy);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error auto-copying groups from P1:", err);
      // Don't throw - presentation was created successfully, just log the error
    }
  }

  return data;
}

export async function getAllPresentations(): Promise<Presentation[]> {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPresentationsByAcademicYear(
  academicYearId: string,
): Promise<Presentation[]> {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPresentation(id: string): Promise<Presentation> {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePresentation(
  id: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  // If teacher is deleting, only delete their own groups
  if (userRole === "teacher" && userId) {
    // Get all groups in this presentation
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id")
      .eq("presentation_id", id)
      .eq("guide_user_id", userId);

    if (groupsError) throw groupsError;

    // Delete only the groups created by this teacher
    if (groups && groups.length > 0) {
      const groupIds = groups.map((g) => g.id);
      const { error: deleteGroupsError } = await supabase
        .from("groups")
        .delete()
        .in("id", groupIds);

      if (deleteGroupsError) throw deleteGroupsError;
    }
  } else {
    // Admin: delete the entire presentation (cascade will delete all groups and related data)
    const { error } = await supabase.from("presentations").delete().eq("id", id);
    if (error) throw error;
  }
}

// =====================================================
// Group Operations
// =====================================================

export async function createGroup(
  input: CreateGroupInput,
  userId?: string,
  userRole?: string,
  forceGroupNumber?: number,
  skipPropagation: boolean = false,
): Promise<Group> {
  // If group number is provided (during copy), use it; otherwise calculate next available
  let nextGroupNumber = forceGroupNumber ?? 1;

  if (!forceGroupNumber) {
    // Compute current max group_number for the presentation
    const { data: maxGroup } = await supabase
      .from("groups")
      .select("group_number")
      .eq("presentation_id", input.presentation_id)
      .order("group_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxGroup && (maxGroup as any).group_number) {
      nextGroupNumber = (maxGroup as any).group_number + 1;
    }
  }

  let group = null as any;
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  while (attempts < MAX_ATTEMPTS) {
    const { data: createdGroup, error: groupError } = await supabase
      .from("groups")
      .insert([
        {
          presentation_id: input.presentation_id,
          group_number: nextGroupNumber,
          guide_name: input.guide_name,
          created_by_user_id: userId,
          // Use provided guide_user_id (when admin selects a teacher), otherwise if creator is a teacher set to creator's id
          guide_user_id: input.guide_user_id ?? (userRole === "teacher" ? userId : null),
        },
      ])
      .select()
      .single();

    if (!groupError) {
      group = createdGroup;
      break;
    }

    // If it's a unique-constraint (another concurrent insert), increment and retry
    const errMsg = (groupError && (groupError.message || "")).toString();
    if (
      errMsg.includes("unique_group_per_presentation") ||
      errMsg.includes("duplicate key") ||
      (groupError as any).code === "23505"
    ) {
      attempts++;
      nextGroupNumber++;
      continue;
    }

    // Some other error: bubble up with context
    throw new Error(
      `Failed to create group: ${groupError.message || JSON.stringify(groupError)}`,
    );
  }

  if (!group) {
    throw new Error(
      "Failed to create group: could not allocate a unique group number after multiple attempts.",
    );
  }

  // Then create 4 students for this group
  const studentsToInsert = input.students.map((name, index) => ({
    group_id: group.id,
    student_name: name,
    position: index + 1,
  }));

  const { error: studentsError } = await supabase
    .from("students")
    .insert(studentsToInsert);

  if (studentsError) {
    // Rollback: delete the group if student creation fails
    await supabase.from("groups").delete().eq("id", group.id);
    throw new Error(
      `Failed to create students for group ${group.id}: ${studentsError.message || JSON.stringify(studentsError)}`,
    );
  }

  // Create empty evaluations for each student
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("group_id", group.id);

  if (students) {
    const evaluationsToInsert = students.map((student) => ({
      student_id: student.id,
    }));

    const { error: evalsError } = await supabase
      .from("evaluations")
      .insert(evaluationsToInsert);
    if (evalsError) {
      throw new Error(
        `Failed to create evaluations for group ${group.id}: ${evalsError.message || JSON.stringify(evalsError)}`,
      );
    }
  }

  // Propagate to P2, P3, P4 if this is P1
  if (!skipPropagation) {
    const presentation = await getPresentation(input.presentation_id);
    if (presentation.name.endsWith("1")) {
      const allPresentations = await getPresentationsByAcademicYear(
        presentation.academic_year_id,
      );
      const otherPresentations = allPresentations.filter(
        (p) =>
          p.id !== presentation.id &&
          (p.name.endsWith("2") || p.name.endsWith("3") || p.name.endsWith("4")),
      );

      for (const otherPres of otherPresentations) {
        try {
          await createGroup(
            {
              ...input,
              presentation_id: otherPres.id,
            },
            userId,
            userRole,
            group.group_number,
            true, // skipPropagation
          );
        } catch (err) {
          console.error(`Error propagating group to ${otherPres.name}:`, err);
        }
      }
    }
  }

  return group;
}

// For teachers - get only their groups
export async function getGroupsByPresentationForTeacher(
  presentationId: string,
  teacherId: string,
): Promise<GroupWithStudents[]> {
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("*")
    .eq("presentation_id", presentationId)
    .eq("guide_user_id", teacherId)
    .order("group_number", { ascending: true });

  if (groupsError) throw groupsError;

  const groupsWithStudents: GroupWithStudents[] = [];

  for (const group of groups || []) {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("group_id", group.id)
      .order("position", { ascending: true });

    if (studentsError) throw studentsError;

    const studentsWithEvaluations: StudentWithEvaluation[] = [];

    for (const student of students || []) {
      const { data: evaluation } = await supabase
        .from("evaluations")
        .select("*")
        .eq("student_id", student.id)
        .single();

      studentsWithEvaluations.push({
        ...student,
        evaluation: evaluation || undefined,
      });
    }

    groupsWithStudents.push({
      ...group,
      students: studentsWithEvaluations,
    });
  }

  return groupsWithStudents;
}

export async function getGroupsByPresentation(
  presentationId: string,
): Promise<GroupWithStudents[]> {
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("*")
    .eq("presentation_id", presentationId)
    .order("group_number", { ascending: true });

  if (groupsError) throw groupsError;

  const groupsWithStudents: GroupWithStudents[] = [];

  for (const group of groups || []) {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("group_id", group.id)
      .order("position", { ascending: true });

    if (studentsError) throw studentsError;

    const studentsWithEvaluations: StudentWithEvaluation[] = [];

    for (const student of students || []) {
      const { data: evaluation } = await supabase
        .from("evaluations")
        .select("*")
        .eq("student_id", student.id)
        .single();

      studentsWithEvaluations.push({
        ...student,
        evaluation: evaluation || undefined,
      });
    }

    groupsWithStudents.push({
      ...group,
      students: studentsWithEvaluations,
    });
  }

  return groupsWithStudents;
}

export async function deleteGroup(id: string): Promise<void> {
  // First, get the group details to know its presentation and group_number
  const { data: groupData, error: fetchError } = await supabase
    .from("groups")
    .select("id, presentation_id, group_number")
    .eq("id", id)
    .single();

  if (fetchError || !groupData) throw fetchError;

  const { presentation_id: presentationId, group_number: groupNumber } = groupData;

  // Get the presentation to know its academic year
  const presentation = await getPresentation(presentationId);

  // Delete the group
  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;

  // Cascade: If this is a group from Presentation 1, delete groups with the same group_number from P2, P3, P4
  // Get all presentations in this academic year
  const { data: allPresentations, error: presentationsError } = await supabase
    .from("presentations")
    .select("id, name")
    .eq("academic_year_id", presentation.academic_year_id);

  if (presentationsError) throw presentationsError;

  // Check if the deleted group is from Presentation 1
  const isFromPresentation1 = presentation.name.endsWith("1");

  if (isFromPresentation1 && allPresentations) {
    // Find presentations 2, 3, 4
    const otherPresentations = allPresentations.filter((p) =>
      p.name.endsWith("2") || p.name.endsWith("3") || p.name.endsWith("4")
    );

    // Delete groups with the same group_number from other presentations
    for (const otherPres of otherPresentations) {
      const { error: cascadeDeleteError } = await supabase
        .from("groups")
        .delete()
        .eq("presentation_id", otherPres.id)
        .eq("group_number", groupNumber);

      if (cascadeDeleteError) {
        console.error(`Error cascading delete to ${otherPres.name}:`, cascadeDeleteError);
        // Don't throw, continue with other presentations
      } else {
        // Normalize group numbers in the affected presentation to remove gaps
        await normalizeGroupNumbers(otherPres.id);
      }
    }
  }

  // Also normalize the original presentation to remove any gaps
  await normalizeGroupNumbers(presentationId);
}

export async function updateGroupGuide(
  id: string,
  guideName: string,
  guideUserId?: string,
): Promise<void> {
  // Fetch the group to see if it's from Presentation 1
  const { data: group } = await supabase
    .from("groups")
    .select("presentation_id, group_number")
    .eq("id", id)
    .single();

  if (!group) throw new Error("Group not found");

  const presentation = await getPresentation(group.presentation_id);

  const { error } = await supabase
    .from("groups")
    .update({
      guide_name: guideName,
      guide_user_id: guideUserId ?? null,
    })
    .eq("id", id);

  if (error) throw error;

  // Propagate if it's Presentation 1
  if (presentation.name.endsWith("1")) {
    const allPresentations = await getPresentationsByAcademicYear(
      presentation.academic_year_id,
    );
    const otherPresIds = allPresentations
      .filter(
        (p) =>
          p.id !== presentation.id &&
          (p.name.endsWith("2") || p.name.endsWith("3") || p.name.endsWith("4")),
      )
      .map((p) => p.id);

    if (otherPresIds.length > 0) {
      await supabase
        .from("groups")
        .update({
          guide_name: guideName,
          guide_user_id: guideUserId ?? null,
        })
        .in("presentation_id", otherPresIds)
        .eq("group_number", group.group_number);
    }
  }
}

export async function normalizeGroupNumbers(
  presentationId: string,
): Promise<void> {
  // Fetch groups ordered by current group_number
  const { data: groups, error } = await supabase
    .from('groups')
    .select('id, group_number')
    .eq('presentation_id', presentationId)
    .order('group_number', { ascending: true });

  if (error) throw error;

  if (!groups || groups.length === 0) return;

  // Update group numbers sequentially starting at 1
  for (let i = 0; i < groups.length; i++) {
    const desired = i + 1;
    const g = groups[i] as any;
    if (g.group_number !== desired) {
      const { error: updErr } = await supabase
        .from('groups')
        .update({ group_number: desired })
        .eq('id', g.id);
      if (updErr) throw updErr;
    }
  }
}

export async function copyGroupsFromPresentation(
  sourcePresentationId: string,
  targetPresentationId: string,
  userId?: string,
  userRole?: string,
): Promise<number> {
  // Get all groups from source presentation
  let sourceGroups = await getGroupsByPresentation(sourcePresentationId);

  // For teachers, filter to only their groups
  if (userRole === "teacher" && userId) {
    sourceGroups = sourceGroups.filter(group => group.guide_user_id === userId);
  }

  // Get all existing groups in target presentation
  const { data: targetGroups } = await supabase
    .from('groups')
    .select('group_number')
    .eq('presentation_id', targetPresentationId);

  const existingGroupNumbers = new Set(
    (targetGroups || []).map(g => g.group_number)
  );

  let copiedCount = 0;

  // Copy only groups that don't already exist (prevent duplicates)
  for (const sourceGroup of sourceGroups) {
    // Skip if a group with this number already exists in target
    if (existingGroupNumbers.has(sourceGroup.group_number)) {
      console.log(`Skipping Group ${sourceGroup.group_number} - already exists in target presentation`);
      continue;
    }

    const studentNames = sourceGroup.students.map((s) => s.student_name);

    // Use createGroup with forceGroupNumber to preserve the source group number
    await createGroup(
      {
        presentation_id: targetPresentationId,
        group_number: sourceGroup.group_number,
        guide_name: sourceGroup.guide_name,
        guide_user_id: (sourceGroup as any).guide_user_id || undefined,
        students: studentNames,
      },
      userId,
      userRole,
      sourceGroup.group_number,
    );

    copiedCount++;
    existingGroupNumbers.add(sourceGroup.group_number);
  }

  return copiedCount;
}

// =====================================================
// Student Operations
// =====================================================

export async function updateStudentName(
  id: string,
  name: string,
): Promise<void> {
  // Fetch student to get group and position
  const { data: student } = await supabase
    .from("students")
    .select("group_id, position")
    .eq("id", id)
    .single();

  if (!student) throw new Error("Student not found");

  const { data: group } = await supabase
    .from("groups")
    .select("presentation_id, group_number")
    .eq("id", student.group_id)
    .single();

  if (!group) throw new Error("Group not found");

  const presentation = await getPresentation(group.presentation_id);

  const { error } = await supabase
    .from("students")
    .update({ student_name: name })
    .eq("id", id);

  if (error) throw error;

  // Propagate if it's Presentation 1
  if (presentation.name.endsWith("1")) {
    const allPresentations = await getPresentationsByAcademicYear(
      presentation.academic_year_id,
    );
    const otherPresIds = allPresentations
      .filter(
        (p) =>
          p.id !== presentation.id &&
          (p.name.endsWith("2") || p.name.endsWith("3") || p.name.endsWith("4")),
      )
      .map((p) => p.id);

    if (otherPresIds.length > 0) {
      const { data: otherGroups } = await supabase
        .from("groups")
        .select("id")
        .in("presentation_id", otherPresIds)
        .eq("group_number", group.group_number);

      const otherGroupIds = otherGroups?.map((og) => og.id) || [];

      if (otherGroupIds.length > 0) {
        await supabase
          .from("students")
          .update({ student_name: name })
          .in("group_id", otherGroupIds)
          .eq("position", student.position);
      }
    }
  }
}

// =====================================================
// Evaluation Operations
// =====================================================

export async function updateEvaluation(
  studentId: string,
  field: keyof Evaluation,
  value: any,
): Promise<Evaluation> {
  try {
    // First, check if evaluation exists
    const { data: existing, error: selectError } = await supabase
      .from("evaluations")
      .select("*")
      .eq("student_id", studentId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is expected for new evaluations
      throw selectError;
    }

    if (existing) {
      // Update existing evaluation
      const { data, error } = await supabase
        .from("evaluations")
        .update({ [field]: value })
        .eq("student_id", studentId)
        .select()
        .single();

      if (error) {
        console.error(`Database error updating ${field}:`, error);
        throw new Error(`Failed to update ${field}: ${error.message}`);
      }
      return data;
    } else {
      // Create new evaluation
      const { data, error } = await supabase
        .from("evaluations")
        .insert([{ student_id: studentId, [field]: value }])
        .select()
        .single();

      if (error) {
        console.error(`Database error inserting ${field}:`, error);
        throw new Error(`Failed to insert ${field}: ${error.message}`);
      }
      return data;
    }
  } catch (error) {
    console.error("updateEvaluation error:", error);
    throw error;
  }
}

export async function resetPresentationMarks(
  presentationId: string,
): Promise<void> {
  // Get all groups for this presentation
  const { data: groups } = await supabase
    .from("groups")
    .select("id")
    .eq("presentation_id", presentationId);

  if (!groups) return;

  // Get all students in these groups
  const groupIds = groups.map((g) => g.id);
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .in("group_id", groupIds);

  if (!students) return;

  // Reset all evaluations for these students
  const studentIds = students.map((s) => s.id);
  const { error } = await supabase
    .from("evaluations")
    .update({
      problem_identification: 0,
      literature_survey: 0,
      software_engineering: 0,
      requirement_analysis: 0,
      srs: 0,
      individual_capacity: 0,
      team_work: 0,
      presentation_qa: 0,
      paper_presentation: 0,
      internal_presentation_ii: 0,
      identification_module: 0,
      coding: 0,
      understanding: 0,
      internal_presentation_iii: 0,
      testing: 0,
      participation_conference: 0,
      publication: 0,
      project_report: 0,
      internal_presentation_iv: 0,
    })
    .in("student_id", studentIds);

  if (error) throw error;
}

// =====================================================
// Utility Functions
// =====================================================

export async function duplicateGroup(
  sourceGroupId: string,
  targetPresentationId: string,
): Promise<Group> {
  // Get source group
  const { data: sourceGroup, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", sourceGroupId)
    .single();

  if (groupError) throw groupError;

  // Get students from source group
  const { data: sourceStudents, error: studentsError } = await supabase
    .from("students")
    .select("*")
    .eq("group_id", sourceGroupId)
    .order("position", { ascending: true });

  if (studentsError) throw studentsError;

  // Get next group number for target presentation
  const { data: existingGroups } = await supabase
    .from("groups")
    .select("group_number")
    .eq("presentation_id", targetPresentationId)
    .order("group_number", { ascending: false })
    .limit(1);

  const nextGroupNumber =
    existingGroups && existingGroups.length > 0
      ? existingGroups[0].group_number + 1
      : 1;

  // Create new group with students
  const studentNames = sourceStudents?.map((s) => s.student_name) || [];

  return createGroup({
    presentation_id: targetPresentationId,
    group_number: nextGroupNumber,
    guide_name: sourceGroup.guide_name,
    guide_user_id: (sourceGroup as any).guide_user_id || undefined,
    students: studentNames,
  });
}

export async function getPresentationStats(
  presentationId: string,
  userId?: string,
  userRole?: string,
) {
  let query = supabase
    .from("groups")
    .select("id")
    .eq("presentation_id", presentationId);

  // Filter by teacher if not admin
  if (userRole === "teacher" && userId) {
    query = query.eq("guide_user_id", userId);
  }

  const { data: groups } = await query;

  const groupCount = groups?.length || 0;
  const studentCount = groupCount * 4;

  return {
    groupCount,
    studentCount,
  };
}

export async function getPresentationsWithGroupsForTeacher(
  academicYearId: string,
  teacherId: string,
): Promise<Presentation[]> {
  // Get presentations for the academic year
  const presentations = await getPresentationsByAcademicYear(academicYearId);

  // Filter presentations that have groups for this teacher
  const filteredPresentations: Presentation[] = [];

  for (const presentation of presentations) {
    const { data: groups } = await supabase
      .from("groups")
      .select("id")
      .eq("presentation_id", presentation.id)
      .eq("guide_user_id", teacherId)
      .limit(1);

    if (groups && groups.length > 0) {
      filteredPresentations.push(presentation);
    }
  }

  return filteredPresentations;
}
