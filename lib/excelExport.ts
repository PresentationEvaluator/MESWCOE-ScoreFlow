import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { calculateAllMarks } from "./calculations";
import { Evaluation, Presentation } from "./types";
import {
  getPresentationsByAcademicYear,
  getAcademicYear,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
} from "./database";

// Helper to prepare data for Semester 1 Sheet (Merging P1 & P2)
async function prepareSemester1Data(
  p1: Presentation | undefined,
  p2: Presentation | undefined,
  userId?: string,
  userRole?: string,
) {
  // Columns
  // Group, Student, Guide
  // P1: Problem, Lit, SoftEng, Req, SRS, Int I (Total)
  // P2: Indiv, Team, Pres, Paper, Int II (Total)
  // Global: Total 100, Total 50

  // Load groups based on user role
  const getGroupsFunction =
    userRole === "teacher" && userId
      ? (id: string) => getGroupsByPresentationForTeacher(id, userId)
      : getGroupsByPresentation;

  const p1Groups = p1 ? await getGroupsFunction(p1.id) : [];
  const p2Groups = p2 ? await getGroupsFunction(p2.id) : [];

  const baseGroups = p1Groups.length > 0 ? p1Groups : p2Groups;
  const secondaryGroups = p1Groups.length > 0 ? p2Groups : p1Groups;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = []; // { s: {r,c}, e: {r,c} }

  // Header Row is handled separately, we return data rows
  let currentRowIndex = 3; // Start data at row 3 (0-indexed -> 3 means Row 4) if headers are 2 rows
  // Actually, let's just align with standard sheet creation.
  // Headers will be manually added.

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP1 = p1Groups.length > 0;

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
          : g1?.students.find(
              (s: any) => s.student_name === sBase.student_name,
            );
        const s2 = !isBaseP1
          ? sBase
          : g2?.students.find(
              (s: any) => s.student_name === sBase.student_name,
            );

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
          group.group_number, // A
          sBase.student_name, // B
          group.guide_name, // C
          // P1
          eval1.problem_identification || 0,
          eval1.literature_survey || 0,
          eval1.software_engineering || 0,
          eval1.requirement_analysis || 0,
          eval1.srs || 0,
          internal1,
          // P2
          eval2.individual_capacity || 0,
          eval2.team_work || 0,
          eval2.presentation_qa || 0,
          eval2.paper_presentation || 0,
          internal2,
          // Global
          total100,
          total50,
        ]);
      } else {
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ col: 0, start: startRow, count: ROWS_PER_GROUP });
      merges.push({ col: 2, start: startRow, count: ROWS_PER_GROUP });

      // Add an empty separator row after each group and merge it across all columns
      const TOTAL_COLS = 16; // Matches the headers length used by semester 1
      const separatorRow = rows.length;
      rows.push([""]); // ensure at least one cell exists
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

async function prepareSemester2Data(
  p3: Presentation | undefined,
  p4: Presentation | undefined,
  userId?: string,
  userRole?: string,
) {
  // Load groups based on user role
  const getGroupsFunction =
    userRole === "teacher" && userId
      ? (id: string) => getGroupsByPresentationForTeacher(id, userId)
      : getGroupsByPresentation;

  const p3Groups = p3 ? await getGroupsFunction(p3.id) : [];
  const p4Groups = p4 ? await getGroupsFunction(p4.id) : [];

  const baseGroups = p3Groups.length > 0 ? p3Groups : p4Groups;
  const secondaryGroups = p3Groups.length > 0 ? p4Groups : p3Groups;

  const secondaryGroupMap = new Map<number, any>();
  secondaryGroups.forEach((g) => secondaryGroupMap.set(g.group_number, g));

  const rows: any[] = [];
  const merges: any[] = [];

  for (const group of baseGroups) {
    const secondaryGroup = secondaryGroupMap.get(group.group_number);
    const isBaseP3 = p3Groups.length > 0;

    const g3 = isBaseP3 ? group : secondaryGroup;
    const g4 = isBaseP3 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

    const ROWS_PER_GROUP = 4;
    for (let i = 0; i < ROWS_PER_GROUP; i++) {
      if (i < studentCount) {
        const sBase = group.students[i];
        const s3 = isBaseP3
          ? sBase
          : g3?.students.find(
              (s: any) => s.student_name === sBase.student_name,
            );
        const s4 = !isBaseP3
          ? sBase
          : g4?.students.find(
              (s: any) => s.student_name === sBase.student_name,
            );

        const s3Final = s3 || g3?.students[i];
        const s4Final = s4 || g4?.students[i];

        const eval3 = s3Final?.evaluation || {};
        const eval4 = s4Final?.evaluation || {};

        const calc3 = calculateAllMarks(eval3);
        const calc4 = calculateAllMarks(eval4);

        const internal3 = calc3.internal_presentation_iii;
        const internal4 = calc4.internal_presentation_iv;
        const total100 = internal3 + internal4;
        const total50 = total100 / 2;

        rows.push([
          group.group_number,
          sBase.student_name,
          group.guide_name,
          // P3
          eval3.identification_module || 0,
          eval3.coding || 0,
          eval3.team_work || 0,
          eval3.understanding || 0,
          eval3.presentation_qa || 0,
          internal3,
          // P4
          eval4.testing || 0,
          eval4.participation_conference || 0,
          eval4.publication || 0,
          eval4.project_report || 0,
          internal4,
          // Global
          total100,
          total50,
        ]);
      } else {
        rows.push([]);
      }
    }

    if (studentCount > 0) {
      merges.push({ col: 0, start: startRow, count: ROWS_PER_GROUP });
      merges.push({ col: 2, start: startRow, count: ROWS_PER_GROUP });

      // Add an empty separator row after each group and merge it across all columns
      const TOTAL_COLS = 16; // Matches the headers length used by semester 2
      const separatorRow = rows.length;
      rows.push([""]); // ensure at least one cell exists
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

export async function exportPresentationToExcel(
  presentationId: string,
  presentationName: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  // Single export fallback
  const workbook = XLSX.utils.book_new();
  const presentation = {
    id: presentationId,
    name: presentationName,
  } as Presentation;

  // We reuse the prepare functions but with one arg undefined
  let data;
  let headers;

  if (presentationName.includes("1") || presentationName.includes("2")) {
    const isP1 = presentationName.includes("1");
    data = await prepareSemester1Data(
      isP1 ? presentation : undefined,
      !isP1 ? presentation : undefined,
      userId,
      userRole,
    );
    headers = [
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
  } else {
    const isP3 = presentationName.includes("3");
    data = await prepareSemester2Data(
      isP3 ? presentation : undefined,
      !isP3 ? presentation : undefined,
      userId,
      userRole,
    );
    headers = [
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
  }

  if (data) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data.rows]);

    // Scale merges
    if (!ws["!merges"]) ws["!merges"] = [];
    data.merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + 1, c: m.col },
          e: { r: m.start + m.count, c: m.col },
        }); // +1 for header
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + 1, c: m.startCol },
          e: { r: m.row + 1, c: m.endCol },
        });
      }
    });

    // Set cols width
    ws["!cols"] = headers.map((h) => ({ wch: 15 }));

    XLSX.utils.book_append_sheet(workbook, ws, "Evaluation");
    const fileName = `${presentationName.replace(/\s+/g, "_")}_Report.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}

export async function exportAnnualReport(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  presentations.sort((a, b) => a.name.localeCompare(b.name));

  const workbook = XLSX.utils.book_new();

  const p1 = presentations.find((p) => p.name.endsWith("1"));
  const p2 = presentations.find((p) => p.name.endsWith("2"));
  const p3 = presentations.find((p) => p.name.endsWith("3"));
  const p4 = presentations.find((p) => p.name.endsWith("4"));
  const academicYear = await getAcademicYear(academicYearId);

  // Sem 1 Sheet
  if (p1 || p2) {
    const { rows, merges } = await prepareSemester1Data(
      p1,
      p2,
      userId,
      userRole,
    );
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

    // Two-line header (Department + Sheet title with semester and academic year)
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project TW Evaluation Sheet (SEM1) (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...mergedHeaders, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge header rows across all columns
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"]!.push({ s: { r: row, c: 0 }, e: { r: row, c: headers.length - 1 } });
    }

    // Center header rows across merged area
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    const header0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const header1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (!ws[header0]) ws[header0] = { t: "s", v: mergedHeaders[0][0] };
    if (!ws[header1]) ws[header1] = { t: "s", v: mergedHeaders[1][0] };
    ws[header0].s = headerCellStyle;
    ws[header1].s = headerCellStyle;

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) {
        ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
      }
    }

    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + mergedHeaders.length + 1, c: m.col },
          e: { r: m.start + m.count + mergedHeaders.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + mergedHeaders.length + 1, c: m.startCol },
          e: { r: m.row + mergedHeaders.length + 1, c: m.endCol },
        });
      }
    });

    // Minimal Styling (Widths)
    ws["!cols"] = headers.map(() => ({ wch: 15 }));
    ws["!cols"][0] = { wch: 10 }; // Group
    ws["!cols"][1] = { wch: 25 }; // Name
    ws["!cols"][2] = { wch: 25 }; // Guide

    // Row heights for header rows
    ws["!rows"] = [{ hpx: 30 }, { hpx: 30 }, { hpx: 30 }];

    XLSX.utils.book_append_sheet(workbook, ws, "Semester 1");
  }

  // Sem 2 Sheet
  if (p3 || p4) {
    const { rows, merges } = await prepareSemester2Data(
      p3,
      p4,
      userId,
      userRole,
    );
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

    // Two-line header (Department + Sheet title with semester and academic year)
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project TW Evaluation Sheet (SEM2) (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...mergedHeaders, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge header rows across all columns
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"]!.push({ s: { r: row, c: 0 }, e: { r: row, c: headers.length - 1 } });
    }

    // Center header rows across merged area
    const headerCellStyle2 = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    const h0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const h1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (!ws[h0]) ws[h0] = { t: "s", v: mergedHeaders[0][0] };
    if (!ws[h1]) ws[h1] = { t: "s", v: mergedHeaders[1][0] };
    ws[h0].s = headerCellStyle2;
    ws[h1].s = headerCellStyle2;

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow2 = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow2, c });
      if (ws[addr]) {
        ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
      }
    }

    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + mergedHeaders.length + 1, c: m.col },
          e: { r: m.start + m.count + mergedHeaders.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + mergedHeaders.length + 1, c: m.startCol },
          e: { r: m.row + mergedHeaders.length + 1, c: m.endCol },
        });
      }
    });

    ws["!cols"] = headers.map(() => ({ wch: 15 }));
    ws["!cols"][0] = { wch: 10 };
    ws["!cols"][1] = { wch: 25 };
    ws["!cols"][2] = { wch: 25 };

    // Row heights for header rows
    ws["!rows"] = [{ hpx: 30 }, { hpx: 30 }, { hpx: 30 }];

    XLSX.utils.book_append_sheet(workbook, ws, "Semester 2");
  }

  XLSX.writeFile(workbook, "Annual_Report.xlsx");
}
