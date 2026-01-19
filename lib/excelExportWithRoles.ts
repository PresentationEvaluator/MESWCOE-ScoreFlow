// Role-based export utilities with filtering options
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { calculateAllMarks } from "./calculations";
import { Presentation, User } from "./types";
import {
  getPresentationsByAcademicYear,
  getAcademicYear,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
} from "./database";
import { applyProfessionalFormattingToWorksheet } from "./excelExportFormatted";

// =====================================================
// Types for export filtering
// =====================================================
export interface ExportFilterOptions {
  presentationId?: string;
  guideId?: string; // For admin to export specific guide's data
  guideName?: string; // For filtering by guide name
  includeAllGuides?: boolean; // For admin to export all data
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Add header rows and merge them across all columns
 */
function addHeaderRows(academicYear: any, semLabel?: string, isAnnual: boolean = false): string[][] {
  const headerRows: string[][] = [["Department of Computer Engineering"]];

  if (isAnnual) {
    headerRows.push([
      `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ]);
  } else {
    const sem = semLabel || "SEM1";
    headerRows.push([
      `BE Project ${sem} TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ]);
  }



  return headerRows;
} 

/**
 * Apply any full-row merges (separator rows) that may be present in the merges array.
 * headerOffset should be the number of header rows above the data + 1 (for the column header row),
 * e.g. headerRows.length + 1 or mergedHeaders.length + 1 or 1 when no extra headers.
 */
function applyRowMerges(ws: any, merges: any[], headerOffset: number) {
  if (!ws["!merges"]) ws["!merges"] = [];
  merges.forEach((m: any) => {
    if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
      ws["!merges"]!.push({
        s: { r: m.row + headerOffset, c: m.startCol },
        e: { r: m.row + headerOffset, c: m.endCol },
      });
    }
  });
}

// =====================================================
// Helper Functions for Teachers
// =====================================================

async function prepareSemester1DataForTeacher(
  p1: Presentation | undefined,
  p2: Presentation | undefined,
  teacherId: string
): Promise<{ rows: any[]; merges: any[] }> {
  const p1Groups = p1
    ? await getGroupsByPresentationForTeacher(p1.id, teacherId)
    : [];
  const p2Groups = p2
    ? await getGroupsByPresentationForTeacher(p2.id, teacherId)
    : [];

  const teacherUser = await (await import("./auth")).getUserById(teacherId);
  const guideNameOverride = teacherUser ? teacherUser.full_name || teacherUser.username : undefined;

  const baseGroups = p1Groups.length > 0 ? p1Groups : p2Groups;
  const secondaryGroups = p1Groups.length > 0 ? p2Groups : p1Groups;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = [];

  const ROWS_PER_GROUP = 4;

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP1 = p1Groups.length > 0;

    const g1 = isBaseP1 ? group : secondaryGroup;
    const g2 = isBaseP1 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

    // Ensure fixed block of ROWS_PER_GROUP rows per group
    for (let i = 0; i < ROWS_PER_GROUP; i++) {
      if (i < studentCount) {
        const sBase = group.students[i];
        const s1 = isBaseP1
          ? sBase
          : g1?.students.find((s: any) => s.student_name === sBase.student_name);
        const s2 = !isBaseP1
          ? sBase
          : g2?.students.find((s: any) => s.student_name === sBase.student_name);

        const s1Final = s1 || g1?.students[i];
        const s2Final = s2 || g2?.students[i];

        const eval1 = s1Final?.evaluation || {};
        const eval2 = s2Final?.evaluation || {};

        const calc1 = calculateAllMarks(eval1);
        const calc2 = calculateAllMarks(eval2);

        const internal1 = calc1.internal_presentation_i;
        const internal2 = calc2.internal_presentation_ii;
        const total100 = internal1 + internal2;
        const total50 = total100 / 2;

        rows.push([
          group.group_number,
          sBase.student_name,
          guideNameOverride || group.guide_name,
          eval1.problem_identification || 0,
          eval1.literature_survey || 0,
          eval1.software_engineering || 0,
          eval1.requirement_analysis || 0,
          eval1.srs || 0,
          internal1,
          eval2.individual_capacity || 0,
          eval2.team_work || 0,
          eval2.presentation_qa || 0,
          eval2.paper_presentation || 0,
          internal2,
          total100,
          total50,
        ]);
      } else {
        // Empty placeholder row to keep block size consistent
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ start: startRow, col: 0, count: ROWS_PER_GROUP });
      merges.push({ start: startRow, col: 2, count: ROWS_PER_GROUP });

      // Add a visual separator row after each group and merge it across all columns
      const TOTAL_COLS = 16;
      const separatorRow = rows.length;
      rows.push([""]); // placeholder cell for separator
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

async function prepareSemester2DataForTeacher(
  p3: Presentation | undefined,
  p4: Presentation | undefined,
  teacherId: string
): Promise<{ rows: any[]; merges: any[] }> {
  const p3Groups = p3
    ? await getGroupsByPresentationForTeacher(p3.id, teacherId)
    : [];
  const p4Groups = p4
    ? await getGroupsByPresentationForTeacher(p4.id, teacherId)
    : [];

  const teacherUser = await (await import("./auth")).getUserById(teacherId);
  const guideNameOverride = teacherUser ? teacherUser.full_name || teacherUser.username : undefined;

  const baseGroups = p3Groups.length > 0 ? p3Groups : p4Groups;
  const secondaryGroups = p3Groups.length > 0 ? p4Groups : p3Groups;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = [];

  const ROWS_PER_GROUP = 4;

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP3 = p3Groups.length > 0;

    const g1 = isBaseP3 ? group : secondaryGroup;
    const g2 = isBaseP3 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

    // Fixed block per group
    for (let i = 0; i < ROWS_PER_GROUP; i++) {
      if (i < studentCount) {
        const sBase = group.students[i];
        const s1 = isBaseP3
          ? sBase
          : g1?.students.find((s: any) => s.student_name === sBase.student_name);
        const s2 = !isBaseP3
          ? sBase
          : g2?.students.find((s: any) => s.student_name === sBase.student_name);

        const s1Final = s1 || g1?.students[i];
        const s2Final = s2 || g2?.students[i];

        const eval1 = s1Final?.evaluation || {};
        const eval2 = s2Final?.evaluation || {};

        const calc1 = calculateAllMarks(eval1);
        const calc2 = calculateAllMarks(eval2);

        const internal1 = calc1.internal_presentation_iii;
        const internal2 = calc2.internal_presentation_iv;
        const total100 = internal1 + internal2;
        const total50 = total100 / 2;

        rows.push([
          group.group_number,
          sBase.student_name,
          guideNameOverride || group.guide_name,
          eval1.identification_module || 0,
          eval1.coding || 0,
          eval1.team_work || 0,
          eval1.understanding || 0,
          eval1.presentation_qa || 0,
          internal1,
          eval2.testing || 0,
          eval2.participation_conference || 0,
          eval2.publication || 0,
          eval2.project_report || 0,
          internal2,
          total100,
          total50,
        ]);
      } else {
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ start: startRow, col: 0, count: ROWS_PER_GROUP });
      merges.push({ start: startRow, col: 2, count: ROWS_PER_GROUP });

      // Add a visual separator row after each group and merge it across all columns
      const TOTAL_COLS = 16;
      const separatorRow = rows.length;
      rows.push([""]); // placeholder cell for separator
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

// =====================================================
// Helper Functions for Admins
// =====================================================

async function prepareSemester1DataForAdmin(
  p1: Presentation | undefined,
  p2: Presentation | undefined,
  filterOptions: ExportFilterOptions
): Promise<{ rows: any[]; merges: any[] }> {
  const p1Groups = p1 ? await getGroupsByPresentation(p1.id) : [];
  const p2Groups = p2 ? await getGroupsByPresentation(p2.id) : [];

  let filteredP1 = p1Groups;
  let filteredP2 = p2Groups;

  // Apply filters
  if (filterOptions.guideName) {
    filteredP1 = filteredP1.filter(
      (g) => g.guide_name === filterOptions.guideName
    );
    filteredP2 = filteredP2.filter(
      (g) => g.guide_name === filterOptions.guideName
    );
  }

  const baseGroups = filteredP1.length > 0 ? filteredP1 : filteredP2;
  const secondaryGroups = filteredP1.length > 0 ? filteredP2 : filteredP1;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = [];

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP1 = filteredP1.length > 0;

    const g1 = isBaseP1 ? group : secondaryGroup;
    const g2 = isBaseP1 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

    const ROWS_PER_GROUP = 4;
    for (let i = 0; i < ROWS_PER_GROUP; i++) {
      if (i < studentCount) {
        const sBase = group.students[i];
        const s1 = isBaseP1
          ? sBase
          : g1?.students.find((s: any) => s.student_name === sBase.student_name);
        const s2 = !isBaseP1
          ? sBase
          : g2?.students.find((s: any) => s.student_name === sBase.student_name);

        const s1Final = s1 || g1?.students[i];
        const s2Final = s2 || g2?.students[i];

        const eval1 = s1Final?.evaluation || {};
        const eval2 = s2Final?.evaluation || {};

        const calc1 = calculateAllMarks(eval1);
        const calc2 = calculateAllMarks(eval2);

        const internal1 = calc1.internal_presentation_i;
        const internal2 = calc2.internal_presentation_ii;
        const total100 = internal1 + internal2;
        const total50 = total100 / 2;

        rows.push([
          group.group_number,
          sBase.student_name,
          group.guide_name,
          eval1.problem_identification || 0,
          eval1.literature_survey || 0,
          eval1.software_engineering || 0,
          eval1.requirement_analysis || 0,
          eval1.srs || 0,
          internal1,
          eval2.individual_capacity || 0,
          eval2.team_work || 0,
          eval2.presentation_qa || 0,
          eval2.paper_presentation || 0,
          internal2,
          total100,
          total50,
        ]);
      } else {
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ start: startRow, col: 0, count: ROWS_PER_GROUP });
      merges.push({ start: startRow, col: 2, count: ROWS_PER_GROUP });
    }
  }

  return { rows, merges };
}

async function prepareSemester2DataForAdmin(
  p3: Presentation | undefined,
  p4: Presentation | undefined,
  filterOptions: ExportFilterOptions
): Promise<{ rows: any[]; merges: any[] }> {
  const p3Groups = p3 ? await getGroupsByPresentation(p3.id) : [];
  const p4Groups = p4 ? await getGroupsByPresentation(p4.id) : [];

  let filteredP3 = p3Groups;
  let filteredP4 = p4Groups;

  // Apply filters
  if (filterOptions.guideName) {
    filteredP3 = filteredP3.filter(
      (g) => g.guide_name === filterOptions.guideName
    );
    filteredP4 = filteredP4.filter(
      (g) => g.guide_name === filterOptions.guideName
    );
  }

  const baseGroups = filteredP3.length > 0 ? filteredP3 : filteredP4;
  const secondaryGroups = filteredP3.length > 0 ? filteredP4 : filteredP3;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = [];

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP3 = filteredP3.length > 0;

    const g1 = isBaseP3 ? group : secondaryGroup;
    const g2 = isBaseP3 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

    const ROWS_PER_GROUP = 4;
    for (let i = 0; i < ROWS_PER_GROUP; i++) {
      if (i < studentCount) {
        const sBase = group.students[i];
        const s1 = isBaseP3
          ? sBase
          : g1?.students.find((s: any) => s.student_name === sBase.student_name);
        const s2 = !isBaseP3
          ? sBase
          : g2?.students.find((s: any) => s.student_name === sBase.student_name);

        const s1Final = s1 || g1?.students[i];
        const s2Final = s2 || g2?.students[i];

        const eval1 = s1Final?.evaluation || {};
        const eval2 = s2Final?.evaluation || {};

        const calc1 = calculateAllMarks(eval1);
        const calc2 = calculateAllMarks(eval2);

        const internal1 = calc1.internal_presentation_iii;
        const internal2 = calc2.internal_presentation_iv;
        const total100 = internal1 + internal2;
        const total50 = total100 / 2;

        rows.push([
          group.group_number,
          sBase.student_name,
          group.guide_name,
          eval1.identification_module || 0,
          eval1.coding || 0,
          eval1.team_work || 0,
          eval1.understanding || 0,
          eval1.presentation_qa || 0,
          internal1,
          eval2.testing || 0,
          eval2.participation_conference || 0,
          eval2.publication || 0,
          eval2.project_report || 0,
          internal2,
          total100,
          total50,
        ]);
      } else {
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ start: startRow, col: 0, count: ROWS_PER_GROUP });
      merges.push({ start: startRow, col: 2, count: ROWS_PER_GROUP });
    }
  }

  return { rows, merges };
}

// =====================================================
// Role-based Export Functions
// =====================================================

/**
 * Export data for a teacher (only their groups)
 */
export async function exportDataAsTeacher(
  academicYearId: string,
  teacherId: string,
  presentationId?: string
) {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  const academicYear = await getAcademicYear(academicYearId);
  const filteredPresentations = presentationId
    ? presentations.filter((p) => p.id === presentationId)
    : presentations;

  if (filteredPresentations.length === 0) {
    throw new Error("No presentations found");
  }

  const p1 = filteredPresentations.find((p) => p.semester === "Presentation 1");
  const p2 = filteredPresentations.find((p) => p.semester === "Presentation 2");
  const p3 = filteredPresentations.find((p) => p.semester === "Presentation 3");
  const p4 = filteredPresentations.find((p) => p.semester === "Presentation 4");

  const workbook = XLSX.utils.book_new();

  // Sem 1 Sheet
  if (p1 || p2) {
    const { rows, merges } = await prepareSemester1DataForTeacher(
      p1,
      p2,
      teacherId
    );

    if (rows.length === 0) {
      console.warn("No data for Semester 1");
    } else {
      const headers = [
        "Group No",
        "Student Name",
        "Guide Name",
        "Problem ID (10)",
        "Literature (10)",
        "Software Eng (10)",
        "Req Analysis (10)",
        "SRS (10)",
        "Internal I (50)",
        "Individual (10)",
        "Team Work (10)",
        "Presentation (10)",
        "Paper (20)",
        "Internal II (50)",
        "Total (100)",
        "Total (50)",
      ];

      const headerRows = addHeaderRows(academicYear, "SEM1");
      const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
      if (!ws["!merges"]) ws["!merges"] = [];

      const colCount = headers.length;
      // Merge header rows across all columns
      for (let r = 0; r < headerRows.length; r++) {
        ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
      }

      // Ensure header rows are centered and bold
      const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
      for (let r = 0; r < headerRows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 0 });
        if (!ws[addr]) ws[addr] = { t: "s", v: headerRows[r][0] };
        ws[addr].s = headerCellStyle;
      }

      // Ensure column header row is centered and bold
      const colHeaderRow = headerRows.length;
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
        if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
      }

      // Apply merges for data rows (supports column merges and row merges)
      merges.forEach((m: any) => {
        if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
          ws["!merges"]!.push({
            s: { r: m.start + headerRows.length + 1, c: m.col },
            e: { r: m.start + m.count + headerRows.length, c: m.col },
          });
        }
      });

      // Apply any full-row separator merges
      applyRowMerges(ws, merges, headerRows.length + 1);

      ws["!cols"] = headers.map(() => ({ wch: 15 }));
      ws["!cols"][0] = { wch: 10 };
      ws["!cols"][1] = { wch: 25 };
      ws["!cols"][2] = { wch: 25 };

      ws["!rows"] = [
        { hpx: 30 },
        { hpx: 30 },
        { hpx: 30 }, // Column headers
      ];

      applyProfessionalFormattingToWorksheet(ws, rows.length + headerRows.length + 1, headers.length);
      XLSX.utils.book_append_sheet(workbook, ws, "Semester 1");
    }
  }

  // Sem 2 Sheet
  if (p3 || p4) {
    const { rows, merges } = await prepareSemester2DataForTeacher(
      p3,
      p4,
      teacherId
    );

    if (rows.length === 0) {
      console.warn("No data for Semester 2");
    } else {
      const headers = [
        "Group No",
        "Student Name",
        "Guide Name",
        "Ident Module (10)",
        "Coding (10)",
        "Team Work (10)",
        "Understanding (10)",
        "Presentation (10)",
        "Internal III (50)",
        "Testing (10)",
        "Participation (10)",
        "Publication (10)",
        "Project Report (20)",
        "Internal IV (50)",
        "Total (100)",
        "Total (50)",
      ];

      const headerRows = addHeaderRows(academicYear, "SEM2");
      const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
      if (!ws["!merges"]) ws["!merges"] = [];

      const colCount = headers.length;
      for (let r = 0; r < headerRows.length; r++) {
        ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
      }

      // Ensure header rows are centered and bold
      const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
      for (let r = 0; r < headerRows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 0 });
        if (!ws[addr]) ws[addr] = { t: "s", v: headerRows[r][0] };
        ws[addr].s = headerCellStyle;
      }

      // Ensure column header row is centered and bold
      const colHeaderRow = headerRows.length;
      for (let c = 0; c < headers.length; c++) {
        const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
        if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
      }

      merges.forEach((m: any) => {
        if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
          ws["!merges"]!.push({
            s: { r: m.start + headerRows.length + 1, c: m.col },
            e: { r: m.start + m.count + headerRows.length, c: m.col },
          });
        }
      });

      // Apply any full-row separator merges
      applyRowMerges(ws, merges, headerRows.length + 1);

      ws["!cols"] = headers.map(() => ({ wch: 15 }));
      ws["!cols"][0] = { wch: 10 };
      ws["!cols"][1] = { wch: 25 };
      ws["!cols"][2] = { wch: 25 };

      ws["!rows"] = [
        { hpx: 30 },
        { hpx: 30 },
        { hpx: 30 }, // Column headers
      ];

      applyProfessionalFormattingToWorksheet(ws, rows.length + headerRows.length + 1, headers.length);
      XLSX.utils.book_append_sheet(workbook, ws, "Semester 2");
    }
  }

  const fileName = `${academicYear.name}_Teacher_Report.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export data as admin with filtering options
 */
export async function exportDataAsAdmin(
  academicYearId: string,
  filterOptions: ExportFilterOptions
) {
  const presentations = await getPresentationsByAcademicYear(academicYearId);

  if (presentations.length === 0) {
    throw new Error("No presentations found");
  }

  const p1 = presentations.find((p) => p.semester === "Presentation 1");
  const p2 = presentations.find((p) => p.semester === "Presentation 2");
  const p3 = presentations.find((p) => p.semester === "Presentation 3");
  const p4 = presentations.find((p) => p.semester === "Presentation 4");

  const workbook = XLSX.utils.book_new();

  // Sem 1 Sheet
  if (p1 || p2) {
    const { rows, merges } = await prepareSemester1DataForAdmin(
      p1,
      p2,
      filterOptions
    );

    if (rows.length === 0) {
      console.warn("No data for Semester 1");
    } else {
      const headers = [
        "Group No",
        "Student Name",
        "Guide Name",
        "Problem ID (10)",
        "Literature (10)",
        "Software Eng (10)",
        "Req Analysis (10)",
        "SRS (10)",
        "Internal I (50)",
        "Individual (10)",
        "Team Work (10)",
        "Presentation (10)",
        "Paper (20)",
        "Internal II (50)",
        "Total (100)",
        "Total (50)",
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      if (!ws["!merges"]) ws["!merges"] = [];
      merges.forEach((m: any) => {
        ws["!merges"]!.push({
          s: { r: m.start + 1, c: m.col },
          e: { r: m.start + m.count, c: m.col },
        });
      });

      // Apply any full-row separator merges
      applyRowMerges(ws, merges, 1);

      ws["!cols"] = headers.map(() => ({ wch: 15 }));
      ws["!cols"][0] = { wch: 10 };
      ws["!cols"][1] = { wch: 25 };
      ws["!cols"][2] = { wch: 25 };

      XLSX.utils.book_append_sheet(workbook, ws, "Semester 1");
    }
  }

  // Sem 2 Sheet
  if (p3 || p4) {
    const { rows, merges } = await prepareSemester2DataForAdmin(
      p3,
      p4,
      filterOptions
    );

    if (rows.length === 0) {
      console.warn("No data for Semester 2");
    } else {
      const headers = [
        "Group No",
        "Student Name",
        "Guide Name",
        "Ident Module (10)",
        "Coding (10)",
        "Team Work (10)",
        "Understanding (10)",
        "Presentation (10)",
        "Internal III (50)",
        "Testing (10)",
        "Participation (10)",
        "Publication (10)",
        "Project Report (20)",
        "Internal IV (50)",
        "Total (100)",
        "Total (50)",
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      if (!ws["!merges"]) ws["!merges"] = [];
      merges.forEach((m: any) => {
        ws["!merges"]!.push({
          s: { r: m.start + 1, c: m.col },
          e: { r: m.start + m.count, c: m.col },
        });
      });

      // Apply any full-row separator merges
      applyRowMerges(ws, merges, 1);

      ws["!cols"] = headers.map(() => ({ wch: 15 }));
      ws["!cols"][0] = { wch: 10 };
      ws["!cols"][1] = { wch: 25 };
      ws["!cols"][2] = { wch: 25 };

      XLSX.utils.book_append_sheet(workbook, ws, "Semester 2");
    }
  }

  const academicYear = await getAcademicYear(academicYearId);
  const fileName = `${academicYear.name}_Admin_Report.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
