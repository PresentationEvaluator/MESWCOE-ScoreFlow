import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { calculateAllMarks } from "./calculations";
import { Presentation } from "./types";
import {
  getPresentationsByAcademicYear,
  getAcademicYear,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
} from "./database";

/**
 * Apply professional formatting to a worksheet:
 * - Black borders on cells with content
 * - Center alignment (horizontal and vertical)
 * - Text wrapping enabled
 * - Proper formatting for merged header cells
 */
export function applyProfessionalFormattingToWorksheet(
  ws: XLSX.WorkSheet,
  rowCount: number,
  colCount: number,
  startDataRow: number = 4,
) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");

  // Ensure merges array exists
  if (!ws["!merges"]) {
    ws["!merges"] = [];
  }

  // Create a map of merged cells for quick lookup
  const mergedCellsMap = new Set<string>();
  ws["!merges"].forEach((merge: any) => {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        mergedCellsMap.add(`${r}_${c}`);
      }
    }
  });

  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];

      // Skip empty cells below header rows, only apply borders to cells with content
      if (!cell || (cell.v === "" && row >= startDataRow)) {
        continue;
      }

      if (!cell) {
        ws[cellAddress] = { t: "s", v: "" };
      }

      // Apply formatting
      ws[cellAddress].s = {
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        font: {
          bold: row < 3, // Bold header rows
        },
      };
    }
  }
}

/**
 * Add header rows and merge them across all columns
 */
function addHeaderRows(
  academicYear: any,
  isAnnual: boolean = false,
): string[][] {
  const headerRows: string[][] = [["Department of Computer Engineering"]];

  if (isAnnual) {
    headerRows.push([
      `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ]);
  } else {
    headerRows.push([
      `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ]);
  }

  return headerRows;
}

/**
 * Apply any full-row merges (separator rows) that may be present in the merges array.
 * headerOffset should be the number of header rows above the data + 1 (for the column header row).
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

// Helper to prepare data for Semester 1 Sheet (Merging P1 & P2)
async function prepareSemester1DataFormatted(
  p1: Presentation | undefined,
  p2: Presentation | undefined,
  guideFilter?: string,
  userId?: string,
  userRole?: string,
) {
  const getGroupsFunction = userRole === "teacher" && userId
    ? (id: string) => getGroupsByPresentationForTeacher(id, userId)
    : getGroupsByPresentation;
  let p1Groups = p1 ? await getGroupsFunction(p1.id) : [];
  let p2Groups = p2 ? await getGroupsFunction(p2.id) : [];
  
  // Filter by guide if specified
  if (guideFilter && guideFilter !== "all") {
    p1Groups = p1Groups.filter((g: any) => g.guide_name === guideFilter);
    p2Groups = p2Groups.filter((g: any) => g.guide_name === guideFilter);
  }
  
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
      const TOTAL_COLS = 16;
      const separatorRow = rows.length;
      rows.push([""]); // placeholder cell for separator row
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

async function prepareSemester2DataFormatted(
  p3: Presentation | undefined,
  p4: Presentation | undefined,
  guideFilter?: string,
  userId?: string,
  userRole?: string,
) {
  const getGroupsFunction = userRole === "teacher" && userId
    ? (id: string) => getGroupsByPresentationForTeacher(id, userId)
    : getGroupsByPresentation;
  let p3Groups = p3 ? await getGroupsFunction(p3.id) : [];
  let p4Groups = p4 ? await getGroupsFunction(p4.id) : [];
  
  // Filter by guide if specified
  if (guideFilter && guideFilter !== "all") {
    p3Groups = p3Groups.filter((g: any) => g.guide_name === guideFilter);
    p4Groups = p4Groups.filter((g: any) => g.guide_name === guideFilter);
  }
  
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

    const g3 = isBaseP3 ? group : secondaryGroup;
    const g4 = isBaseP3 ? secondaryGroup : group;

    const studentCount = group.students.length;
    const startRow = rows.length;

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
      const TOTAL_COLS = 16;
      const separatorRow = rows.length;
      rows.push([""]); // placeholder cell for separator row
      merges.push({ row: separatorRow, startCol: 0, endCol: TOTAL_COLS - 1 });
    }
  }

  return { rows, merges };
}

/**
 * Export individual presentations separately with formatting
 * P1 only, P2 only, P3 only, P4 only
 */
export async function exportPresentationSeparatelyFormatted(
  academicYearId: string,
  presentationId: string,
  presentationName: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const presentation = {
    id: presentationId,
    name: presentationName,
  } as Presentation;

  // Get academic year info
  const academicYear = await getAcademicYear(academicYearId);
  const presentationNumber = parseInt(
    presentationName.match(/\d+/)?.[0] || "1",
  );

  let data;
  let headers;

  if (presentationName.includes("1")) {
    // Only Presentation 1
    data = await prepareSemester1DataFormatted(presentation, undefined, userId, userRole);
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
  } else if (presentationName.includes("2")) {
    // Only Presentation 2
    data = await prepareSemester1DataFormatted(undefined, presentation, userId, userRole);
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
  } else if (presentationName.includes("3")) {
    // Only Presentation 3
    data = await prepareSemester2DataFormatted(presentation, undefined, userId, userRole);
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
  } else if (presentationName.includes("4")) {
    // Only Presentation 4
    data = await prepareSemester2DataFormatted(undefined, presentation, userId, userRole);
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
  } else {
    throw new Error("Invalid presentation name");
  }

  if (data) {
    // Create merged header rows
    const semLabel = presentationNumber <= 2 ? "SEM1" : "SEM2";
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project ${semLabel} TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      ...mergedHeaders,
      headers,
      ...data.rows,
    ]);

    // Apply merges for header rows (merge all columns for each header row)
    if (!ws["!merges"]) ws["!merges"] = [];
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"].push({
        s: { r: row, c: 0 },
        e: { r: row, c: headers.length - 1 },
      });
    }

    // Center header rows and column headers
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    for (let r = 0; r < mergedHeaders.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[addr]) ws[addr] = { t: "s", v: mergedHeaders[r][0] };
      ws[addr].s = headerCellStyle;
    }
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Apply merges for data
    data.merges.forEach((m: any) => {
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

    // Set column widths
    ws["!cols"] = [
      { wch: 10 }, // Group No
      { wch: 25 }, // Student Name
      { wch: 25 }, // Guide Name
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];

    // Set row height for header
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    // Apply formatting
    applyProfessionalFormattingToWorksheet(
      ws,
      data.rows.length + mergedHeaders.length + 1,
      headers.length,
    );

    XLSX.utils.book_append_sheet(workbook, ws, presentationName);
    const fileName = `${presentationName.replace(/\s+/g, "_")}_Formatted.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}

/**
 * Export all presentations separately into one workbook with 4 sheets
 * Sheet 1: Presentation 1 only
 * Sheet 2: Presentation 2 only
 * Sheet 3: Presentation 3 only
 * Sheet 4: Presentation 4 only
 */
export async function exportAllPresentationsSeparatelyFormatted(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  presentations.sort((a, b) => a.name.localeCompare(b.name));

  const workbook = XLSX.utils.book_new();

  // Get academic year info for header text
  const academicYear = await getAcademicYear(academicYearId);

  const p1 = presentations.find((p) => p.name.includes("1"));
  const p2 = presentations.find((p) => p.name.includes("2"));
  const p3 = presentations.find((p) => p.name.includes("3"));
  const p4 = presentations.find((p) => p.name.includes("4"));

  // Sheet 1: Presentation 1 Only
  if (p1) {
    const { rows, merges } = await prepareSemester1DataFormatted(p1, undefined, userId, userRole);
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

    const headerRows = addHeaderRows(academicYear, true);
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    const colCount = headers.length;
    // Merge header rows across columns
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

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = headerRows.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Data merges (column merges and full-row separator merges)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + headerRows.length + 1, c: m.col },
          e: { r: m.start + m.count + headerRows.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + headerRows.length + 1, c: m.startCol },
          e: { r: m.row + headerRows.length + 1, c: m.endCol },
        });
      }
    });

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + headerRows.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 1");
  }

  // Sheet 2: Presentation 2 Only
  if (p2) {
    const { rows, merges } = await prepareSemester1DataFormatted(undefined, p2, userId, userRole);
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

    const headerRows = addHeaderRows(academicYear, true);
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    const colCount = headers.length;
    // Merge header rows across columns
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

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = headerRows.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Data merges (column merges and full-row separator merges)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + headerRows.length + 1, c: m.col },
          e: { r: m.start + m.count + headerRows.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + headerRows.length + 1, c: m.startCol },
          e: { r: m.row + headerRows.length + 1, c: m.endCol },
        });
      }
    });

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + headerRows.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 2");
  }

  // Sheet 3: Presentation 3 Only
  if (p3) {
    const { rows, merges } = await prepareSemester2DataFormatted(p3, undefined);
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

    const headerRows = addHeaderRows(academicYear, true);
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    const colCount = headers.length;
    // Merge header rows across columns
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

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = headerRows.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Data merges (column merges and full-row separator merges)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + headerRows.length + 1, c: m.col },
          e: { r: m.start + m.count + headerRows.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + headerRows.length + 1, c: m.startCol },
          e: { r: m.row + headerRows.length + 1, c: m.endCol },
        });
      }
    });

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + headerRows.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 3");
  }

  // Sheet 4: Presentation 4 Only
  if (p4) {
    const { rows, merges } = await prepareSemester2DataFormatted(undefined, p4);
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

    const headerRows = addHeaderRows(academicYear, true);
    const ws = XLSX.utils.aoa_to_sheet([...headerRows, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    const colCount = headers.length;
    // Merge header rows across columns
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

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = headerRows.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Data merges (column merges and full-row separator merges)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.start + headerRows.length + 1, c: m.col },
          e: { r: m.start + m.count + headerRows.length, c: m.col },
        });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({
          s: { r: m.row + headerRows.length + 1, c: m.startCol },
          e: { r: m.row + headerRows.length + 1, c: m.endCol },
        });
      }
    });

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + headerRows.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 4");
  }

  XLSX.writeFile(workbook, "All_Presentations_Separated_Formatted.xlsx");
}

/**
 * Export combined Semester 1 (P1 + P2) with formatting
 */
export async function exportSemester1CombinedFormatted(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  const academicYear = await getAcademicYear(academicYearId);
  const p1 = presentations.find((p) => p.name.includes("1"));
  const p2 = presentations.find((p) => p.name.includes("2"));

  const workbook = XLSX.utils.book_new();

  if (p1 || p2) {
    const { rows, merges } = await prepareSemester1DataFormatted(p1, p2, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project SEM1 TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...mergedHeaders, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    // Apply merges for header rows (merge all columns for each header row)
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"].push({
        s: { r: row, c: 0 },
        e: { r: row, c: headers.length - 1 },
      });
    }

    // Ensure header rows are centered and bold
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

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Semester 1");
  }

  XLSX.writeFile(workbook, "Semester_1_Combined_Formatted.xlsx");
}

/**
 * Export combined Semester 2 (P3 + P4) with formatting
 */
export async function exportSemester2CombinedFormatted(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  const academicYear = await getAcademicYear(academicYearId);
  const p3 = presentations.find((p) => p.name.includes("3"));
  const p4 = presentations.find((p) => p.name.includes("4"));

  const workbook = XLSX.utils.book_new();

  if (p3 || p4) {
    const { rows, merges } = await prepareSemester2DataFormatted(p3, p4, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project SEM2 TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...mergedHeaders, headers, ...rows]);
    if (!ws["!merges"]) ws["!merges"] = [];

    // Apply merges for header rows (merge all columns for each header row)
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"].push({
        s: { r: row, c: 0 },
        e: { r: row, c: headers.length - 1 },
      });
    }

    // Ensure header rows are centered and bold
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    for (let r = 0; r < mergedHeaders.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[addr]) ws[addr] = { t: "s", v: mergedHeaders[r][0] };
      ws[addr].s = headerCellStyle;
    }

    // Ensure column header row (below merged headers) is center aligned
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
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

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Semester 2");
  }

  XLSX.writeFile(workbook, "Semester_2_Combined_Formatted.xlsx");
}

/**
 * Export annual report with all presentations (P1, P2, P3, P4) with professional formatting
 * Creates a comprehensive 4-sheet workbook with separated presentations
 */
export async function exportAnnualReportFormattedAndSeparated(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  const academicYear = await getAcademicYear(academicYearId);

  // Sort presentations by extracted number or by order
  presentations.sort((a, b) => {
    const aNum = parseInt(a.name.match(/\d+/)?.[0] || "999");
    const bNum = parseInt(b.name.match(/\d+/)?.[0] || "999");
    if (aNum !== bNum) return aNum - bNum;
    return a.name.localeCompare(b.name);
  });

  const workbook = XLSX.utils.book_new();

  // Get presentations by order - first 4 presentations
  const p1 = presentations.length > 0 ? presentations[0] : undefined;
  const p2 = presentations.length > 1 ? presentations[1] : undefined;
  const p3 = presentations.length > 2 ? presentations[2] : undefined;
  const p4 = presentations.length > 3 ? presentations[3] : undefined;

  // Sheet 1: Presentation 1 Only
  if (p1) {
    const { rows, merges } = await prepareSemester1DataFormatted(p1, undefined, guideFilter, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Initialize merges array on worksheet
    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge header rows across all columns
    for (let r = 0; r < mergedHeaders.length; r++) {
      ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } });
    }

    // Center header rows and column headers
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    const h0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const h1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (!ws[h0]) ws[h0] = { t: "s", v: mergedHeaders[0][0] };
    if (!ws[h1]) ws[h1] = { t: "s", v: mergedHeaders[1][0] };
    ws[h0].s = headerCellStyle;
    ws[h1].s = headerCellStyle;
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Apply data merges (supports column merges and full-row separators)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({ s: { r: m.start + mergedHeaders.length + 1, c: m.col }, e: { r: m.start + m.count + mergedHeaders.length, c: m.col } });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({ s: { r: m.row + mergedHeaders.length + 1, c: m.startCol }, e: { r: m.row + mergedHeaders.length + 1, c: m.endCol } });
      }
    });

    // Set column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];

    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 1");
  }

  // Sheet 2: Presentation 2 Only
  if (p2) {
    const { rows, merges } = await prepareSemester1DataFormatted(undefined, p2, guideFilter, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    if (!ws["!merges"]) ws["!merges"] = [];
    for (let r = 0; r < mergedHeaders.length; r++) {
      ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } });
    }

    // Center header rows and column headers
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    const h0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const h1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (!ws[h0]) ws[h0] = { t: "s", v: mergedHeaders[0][0] };
    if (!ws[h1]) ws[h1] = { t: "s", v: mergedHeaders[1][0] };
    ws[h0].s = headerCellStyle;
    ws[h1].s = headerCellStyle;
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Apply data merges (supports both column merges and full-row separators)
    merges.forEach((m: any) => {
      if (m.col !== undefined && m.start !== undefined && m.count !== undefined) {
        ws["!merges"]!.push({ s: { r: m.start + mergedHeaders.length + 1, c: m.col }, e: { r: m.start + m.count + mergedHeaders.length, c: m.col } });
      } else if (m.row !== undefined && m.startCol !== undefined && m.endCol !== undefined) {
        ws["!merges"]!.push({ s: { r: m.row + mergedHeaders.length + 1, c: m.startCol }, e: { r: m.row + mergedHeaders.length + 1, c: m.endCol } });
      }
    });

    ws["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 2");
  }

  // Sheet 3: Presentation 3 Only
  if (p3) {
    const { rows, merges } = await prepareSemester2DataFormatted(p3, undefined, guideFilter, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 3");
  }

  // Sheet 4: Presentation 4 Only
  if (p4) {
    const { rows, merges } = await prepareSemester2DataFormatted(undefined, p4, guideFilter, userId, userRole);
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

    // Create merged header rows
    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project Annual TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    ws["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 }, // Column headers
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );
    XLSX.utils.book_append_sheet(workbook, ws, "Presentation 4");
  }

  XLSX.writeFile(workbook, "Annual_Report_Formatted_Separated.xlsx");
}

/**
 * Export annual report organized by semester
 * Sheet 1: Semester 1 (P1 + P2) with Internal I + Internal II
 * Sheet 2: Semester 2 (P3 + P4) with Internal III + Internal IV
 */
export async function exportAnnualReportBySemester(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  const presentations = await getPresentationsByAcademicYear(academicYearId);
  const academicYear = await getAcademicYear(academicYearId);

  // Sort presentations by extracted number
  presentations.sort((a, b) => {
    const aNum = parseInt(a.name.match(/\d+/)?.[0] || "999");
    const bNum = parseInt(b.name.match(/\d+/)?.[0] || "999");
    if (aNum !== bNum) return aNum - bNum;
    return a.name.localeCompare(b.name);
  });

  const workbook = XLSX.utils.book_new();

  const p1 = presentations.length > 0 ? presentations[0] : undefined;
  const p2 = presentations.length > 1 ? presentations[1] : undefined;
  const p3 = presentations.length > 2 ? presentations[2] : undefined;
  const p4 = presentations.length > 3 ? presentations[3] : undefined;

  // Semester 1: P1 + P2
  if (p1 || p2) {
    const { rows, merges } = await prepareSemester1DataFormatted(
      p1,
      p2,
      guideFilter,
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

    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project SEM1 TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge header rows
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"].push({
        s: { r: row, c: 0 },
        e: { r: row, c: headers.length - 1 },
      });
    }

    // Center header rows and column headers
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    for (let r = 0; r < mergedHeaders.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[addr]) ws[addr] = { t: "s", v: mergedHeaders[r][0] };
      ws[addr].s = headerCellStyle;
    }
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Apply data merges (column merges and full-row separator merges)
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

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 },
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );

    XLSX.utils.book_append_sheet(workbook, ws, "Semester 1");
  }

  // Semester 2: P3 + P4
  if (p3 || p4) {
    const { rows, merges } = await prepareSemester2DataFormatted(
      p3,
      p4,
      guideFilter,
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

    const mergedHeaders = [
      ["Department of Computer Engineering"],
      [
        `BE Project SEM2 TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
      ],
    ];

    const allRows = [...mergedHeaders, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    if (!ws["!merges"]) ws["!merges"] = [];

    // Merge header rows
    for (let row = 0; row < mergedHeaders.length; row++) {
      ws["!merges"].push({
        s: { r: row, c: 0 },
        e: { r: row, c: headers.length - 1 },
      });
    }

    // Center header rows and column headers
    const headerCellStyle = { alignment: { horizontal: "center", vertical: "center", wrapText: true }, font: { bold: true } };
    for (let r = 0; r < mergedHeaders.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (!ws[addr]) ws[addr] = { t: "s", v: mergedHeaders[r][0] };
      ws[addr].s = headerCellStyle;
    }
    const colHeaderRow = mergedHeaders.length;
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: colHeaderRow, c });
      if (ws[addr]) ws[addr].s = { ...(ws[addr].s || {}), alignment: { horizontal: "center", vertical: "center" }, font: { bold: true } };
    }

    // Apply data merges (column merges and full-row separator merges)
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

    ws["!cols"] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      ...headers.slice(3).map(() => ({ wch: 15 })),
    ];
    ws["!rows"] = [
      { hpx: 30 },
      { hpx: 30 },
      { hpx: 30 },
    ];

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length + mergedHeaders.length + 1,
      headers.length,
    );

    XLSX.utils.book_append_sheet(workbook, ws, "Semester 2");
  }

  XLSX.writeFile(workbook, "Annual_Report_By_Semester.xlsx");
}
