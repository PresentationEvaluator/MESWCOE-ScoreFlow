import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import { calculateAllMarks } from "./calculations";
import { Presentation, Evaluation } from "./types";
import {
  getPresentationsByAcademicYear,
  getAcademicYear,
  getGroupsByPresentation,
  getGroupsByPresentationForTeacher,
} from "./database";
import { applyProfessionalFormattingToWorksheet } from "./excelExportFormatted";
import { BaseColumnConfig, CustomColumn } from "./types";
import { DEFAULT_COLUMNS } from "./constants";

/**
 * Helper to get visible columns for export
 */
function getExportColumns(presentation: Presentation, presNum: number) {
  const defaultConfig = DEFAULT_COLUMNS[presNum] || {};
  const keys = Object.keys(defaultConfig);

  const visibleBase = keys.map(key => {
    const defaultCol = defaultConfig[key];
    const config = (presentation.custom_columns as any)?.[key];

    if (typeof config === "string") {
      return { key, name: config, maxMark: defaultCol.maxMark, isHidden: false };
    } else if (config && typeof config === "object") {
      return {
        key,
        name: config.name || defaultCol.name,
        maxMark: config.maxMark || defaultCol.maxMark,
        isHidden: !!config.isHidden
      };
    }
    return { key, name: defaultCol.name, maxMark: defaultCol.maxMark, isHidden: false };
  }).filter(c => !c.isHidden);

  return visibleBase;
}

/**
 * Add header rows and merge them across all columns
 */
function addHeaderRows(
  presentationName: string,
  academicYear: any,
): string[][] {
  // Determine SEM label based on presentation or semester button names
  let semLabel = "SEM1";
  if (/Semester\s*7/i.test(presentationName)) {
    semLabel = "SEM1";
  } else if (/Semester\s*8/i.test(presentationName)) {
    semLabel = "SEM2";
  } else if (
    /\b[34]\b/.test(presentationName) ||
    /[34]$/.test(presentationName)
  ) {
    semLabel = "SEM2";
  } else if (
    /\b[12]\b/.test(presentationName) ||
    /[12]$/.test(presentationName)
  ) {
    semLabel = "SEM1";
  }

  const headerRows = [
    ["M.E.S. Wadia College of Engineering, Pune-01"],
    ["Department of Computer Engineering"],
    [
      `BE Project ${semLabel} TW Evaluation Sheet (${academicYear.start_year}–${academicYear.end_year})`,
    ],
  ];

  return headerRows;
}

/**
 * Add cell merges for Group No and Guide Name columns
 * These should appear only once per group
 */
function addGroupMerges(
  ws: XLSX.WorkSheet,
  groups: any[],
  startRowIndex: number = 1,
  rowBlockSize: number = 4,
  totalCols: number = 9,
) {
  const merges: Array<{
    s: { r: number; c: number };
    e: { r: number; c: number };
  }> = ws["!merges"] || [];
  let currentDataRow = startRowIndex;

  for (const _group of groups) {
    // Vertical merges for Group ID and Guide Name
    merges.push({
      s: { r: currentDataRow, c: 0 },
      e: { r: currentDataRow + rowBlockSize - 1, c: 0 },
    });
    merges.push({
      s: { r: currentDataRow, c: 2 },
      e: { r: currentDataRow + rowBlockSize - 1, c: 2 },
    });

    // Horizontal merge for spacer row
    const spacerRowIndex = currentDataRow + rowBlockSize;
    merges.push({
      s: { r: spacerRowIndex, c: 0 },
      e: { r: spacerRowIndex, c: totalCols - 1 },
    });

    currentDataRow += rowBlockSize + 1;
  }

  ws["!merges"] = merges;
}

/**
 * Add cell merges for Semester reports (which have combined groups)
 * Groups are from presentation 1, so use that for merge tracking
 */
function addGroupMergesForSemester(
  ws: XLSX.WorkSheet,
  groups1: any[],
  groups2: any[],
  startRowIndex: number = 1,
  rowBlockSize: number = 4,
  totalCols: number = 16,
) {
  const merges: Array<{
    s: { r: number; c: number };
    e: { r: number; c: number };
  }> = ws["!merges"] || [];
  let currentDataRow = startRowIndex;

  for (const _group1 of groups1) {
    merges.push({
      s: { r: currentDataRow, c: 0 },
      e: { r: currentDataRow + rowBlockSize - 1, c: 0 },
    });
    merges.push({
      s: { r: currentDataRow, c: 2 },
      e: { r: currentDataRow + rowBlockSize - 1, c: 2 },
    });

    // Spacer merge
    const spacerRowIndex = currentDataRow + rowBlockSize;
    merges.push({
      s: { r: spacerRowIndex, c: 0 },
      e: { r: spacerRowIndex, c: totalCols - 1 },
    });

    currentDataRow += rowBlockSize + 1;
  }

  ws["!merges"] = merges;
}

/**
 * PRESENTATION 1 Export
 * Columns: Group No | Student Name | Guide Name | Problem ID (10) | Literature (10) |
 *          Software Eng (10) | Req Analysis (10) | SRS (10) | Internal I (50)
 */
export async function exportPresentation1Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p1 = presentations.find((p) => p.name.endsWith("1"));
    if (!p1) throw new Error("Presentation 1 not found");
    const academicYear = await getAcademicYear(academicYearId);
    let groups = userRole === "teacher" && userId
      ? await getGroupsByPresentationForTeacher(p1.id, userId)
      : await getGroupsByPresentation(p1.id);

    if (guideFilter && guideFilter !== "all") {
      groups = groups.filter((g: any) => g.guide_name === guideFilter);
    }

    const rows: any[] = [];
    const headerRows = addHeaderRows(p1.name, academicYear);
    rows.push(...headerRows);

    const visibleCols = getExportColumns(p1, 1);
    const extraColumnHeaders = p1.extra_columns?.map(col => `${col.name} (${col.maxMark})`) || [];
    const totalMaxSum = visibleCols.reduce((sum, c) => sum + c.maxMark, 0) +
      (p1.extra_columns?.reduce((sum, col) => sum + col.maxMark, 0) || 0);

    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols.map(c => `${c.name} (${c.maxMark})`),
      ...extraColumnHeaders, `Internal I (${totalMaxSum})`,
    ];
    rows.push(columnHeaders);

    const ROWS_PER_GROUP = 4;
    for (const group of groups) {
      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student = group.students[i];
        const evaluation = (student?.evaluation || {}) as Evaluation;

        const baseMarks = visibleCols.map(c => Number((evaluation as any)[c.key]) || 0);
        const extraMarksValues = p1.extra_columns?.map(col => evaluation.extra_marks?.[col.id] ?? 0) || [];
        const totalObtained = baseMarks.reduce((a, b) => a + b, 0) + extraMarksValues.reduce((a, b) => a + b, 0);

        rows.push([
          group.group_number, student?.student_name || "", group.guide_name,
          ...baseMarks, ...extraMarksValues, totalObtained,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (!ws["!merges"]) ws["!merges"] = [];
    const colCount = columnHeaders.length;
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }
    applyProfessionalFormattingToWorksheet(ws, rows.length, colCount, headerRows.length + 1);
    addGroupMerges(ws, groups, headerRows.length + 1, ROWS_PER_GROUP, colCount);

    // Set column widths
    const dynamicCols = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    // Add widths for extra columns
    if (p1.extra_columns) {
      p1.extra_columns.forEach(() => dynamicCols.push({ wch: 15 }));
    }
    dynamicCols.push({ wch: 15 }); // for Internal I total

    ws["!cols"] = dynamicCols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P1 Marks");
    XLSX.writeFile(wb, `Presentation_1_Marks_${academicYear.start_year}-${academicYear.end_year}.xlsx`);
  } catch (error) {
    console.error("Error exporting P1 marks:", error);
    throw error;
  }
}

export async function exportProjectClassificationReport(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p1 = presentations.find((p) => p.name.endsWith("1"));
    if (!p1) throw new Error("Presentation 1 data required");
    const academicYear = await getAcademicYear(academicYearId);
    let groups = userRole === "teacher" && userId
      ? await getGroupsByPresentationForTeacher(p1.id, userId)
      : await getGroupsByPresentation(p1.id);

    if (guideFilter && guideFilter !== "all") {
      groups = groups.filter((g: any) => g.guide_name === guideFilter);
    }

    const ROWS_PER_GROUP = 4;
    const TOTAL_COLS = 12;
    const headerRows = [
      ["M.E.S. Wadia College of Engineering, Pune-01"],
      ["Department of Computer Engineering"],
      [`Student Project ${academicYear.start_year}-${academicYear.end_year % 100}`],
    ];
    const rows: any[] = [...headerRows];

    const categoryRow = Array(TOTAL_COLS).fill("");
    categoryRow[0] = "Group ID";
    categoryRow[1] = "Name of Student";
    categoryRow[2] = "Guide Name";
    categoryRow[3] = "Final Project title";
    categoryRow[4] = "In-Home/ Sponsored";
    categoryRow[5] = "Classification of project";
    categoryRow[9] = "Scope of Finance";
    rows.push(categoryRow);

    const subHeaderRow = [
      "", "", "", "", "",
      "Product", "Research", "Application", "Design",
      "Insti", "Self", "Industry",
    ];
    rows.push(subHeaderRow);

    for (const group of groups) {
      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student = group.students[i];
        const evaluation = (student?.evaluation || {}) as Evaluation;
        const tick = "√";
        const industryDisplay = (evaluation.finance_industry || 0) > 0 ?
          `${tick}${evaluation.industry_name ? ` - ${evaluation.industry_name}` : ""}` : "";

        // Build the In-Home/Sponsored display with industry name if applicable
        let projectTypeDisplay = evaluation.project_type_in_house_sponsored || "";
        if (evaluation.project_type_in_house_sponsored === "Sponsored" && evaluation.industry_name) {
          projectTypeDisplay = `${projectTypeDisplay}\n(${evaluation.industry_name})`;
        }

        rows.push([
          group.group_number, student?.student_name || "", group.guide_name,
          evaluation.project_title || "", projectTypeDisplay,
          (evaluation.classification_product || 0) > 0 ? tick : "",
          (evaluation.classification_research || 0) > 0 ? tick : "",
          (evaluation.classification_application || 0) > 0 ? tick : "",
          (evaluation.classification_design || 0) > 0 ? tick : "",
          (evaluation.finance_institute || 0) > 0 ? tick : "",
          (evaluation.finance_self || 0) > 0 ? tick : "",
          industryDisplay,
        ]);
      }
      // Add spacer row
      rows.push(Array(TOTAL_COLS).fill(""));
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const merges: XLSX.Range[] = [];
    const collegeHeaderCount = headerRows.length;
    const catRowIdx = collegeHeaderCount;
    const subHeaderRowIdx = collegeHeaderCount + 1;
    const dataStartIdx = collegeHeaderCount + 2;

    for (let r = 0; r < collegeHeaderCount; r++) {
      merges.push({ s: { r, c: 0 }, e: { r, c: TOTAL_COLS - 1 } });
    }
    merges.push({ s: { r: catRowIdx, c: 5 }, e: { r: catRowIdx, c: 8 } });
    merges.push({ s: { r: catRowIdx, c: 9 }, e: { r: catRowIdx, c: 11 } });
    for (let c = 0; c <= 4; c++) {
      merges.push({ s: { r: catRowIdx, c }, e: { r: subHeaderRowIdx, c } });
    }

    let currentDataRow = dataStartIdx;
    for (const _group of groups) {
      merges.push({ s: { r: currentDataRow, c: 0 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 0 } });
      merges.push({ s: { r: currentDataRow, c: 2 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 2 } });
      merges.push({ s: { r: currentDataRow, c: 3 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 3 } });
      merges.push({ s: { r: currentDataRow, c: 4 }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c: 4 } });
      for (let c = 5; c <= 11; c++) {
        merges.push({ s: { r: currentDataRow, c }, e: { r: currentDataRow + ROWS_PER_GROUP - 1, c } });
      }
      // Horizontal merge for spacer row
      const spacerRowIndex = currentDataRow + ROWS_PER_GROUP;
      merges.push({ s: { r: spacerRowIndex, c: 0 }, e: { r: spacerRowIndex, c: TOTAL_COLS - 1 } });

      currentDataRow += ROWS_PER_GROUP + 1;
    }
    ws["!merges"] = merges;
    applyProfessionalFormattingToWorksheet(ws, rows.length, TOTAL_COLS, dataStartIdx);
    ws["!cols"] = [
      { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 45 }, { wch: 20 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Project Classification");
    XLSX.writeFile(wb, `Project_Classification_${academicYear.start_year}-${academicYear.end_year}.xlsx`);
  } catch (error) {
    console.error("Error exporting Classification report:", error);
    throw error;
  }
}

/**
 * PRESENTATION 2 Export
 * Columns: Group No | Student Name | Guide Name | Individual (10) | Team Work (10) |
 *          Presentation (10) | Paper (20) | Internal II (50) | Total (100) | Total (50)
 */
export async function exportPresentation2Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p2 = presentations.find((p) => p.name.endsWith("2"));

    if (!p2) {
      throw new Error("Presentation 2 not found");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    let groups =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p2.id, userId)
        : await getGroupsByPresentation(p2.id);

    // Filter by guide if specified
    if (guideFilter && guideFilter !== "all") {
      groups = groups.filter((g: any) => g.guide_name === guideFilter);
    }

    const rows: any[] = [];

    // Add header rows
    const headerRows = addHeaderRows(p2.name, academicYear);
    rows.push(...headerRows);

    const visibleCols = getExportColumns(p2, 2);
    const extraColumnHeaders = p2.extra_columns?.map(col => `${col.name} (${col.maxMark})`) || [];
    const totalMaxSum = visibleCols.reduce((sum, c) => sum + c.maxMark, 0) +
      (p2.extra_columns?.reduce((sum, col) => sum + col.maxMark, 0) || 0);

    // Column headers
    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols.map(c => `${c.name} (${c.maxMark})`),
      ...extraColumnHeaders, `Internal II (${totalMaxSum})`,
    ];
    rows.push(columnHeaders);

    const ROWS_PER_GROUP = 4;
    for (const group of groups) {
      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student = group.students[i];
        const evaluation = (student?.evaluation || {}) as Evaluation;

        const baseMarks = visibleCols.map(c => Number((evaluation as any)[c.key]) || 0);
        const extraMarksValues = p2.extra_columns?.map(col => evaluation.extra_marks?.[col.id] ?? 0) || [];
        const totalObtained = baseMarks.reduce((a, b) => a + b, 0) + extraMarksValues.reduce((a, b) => a + b, 0);

        rows.push([
          group.group_number, student?.student_name || "", group.guide_name,
          ...baseMarks, ...extraMarksValues, totalObtained,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add merges for header rows
    if (!ws["!merges"]) {
      ws["!merges"] = [];
    }
    const colCount = columnHeaders.length;
    // Merge header rows dynamically (now 2 lines long)
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length,
      colCount,
      headerRows.length + 1,
    );
    addGroupMerges(ws, groups, headerRows.length + 1, ROWS_PER_GROUP, colCount);

    // Set column widths
    const dynamicCols = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    // Add widths for extra columns
    if (p2.extra_columns) {
      p2.extra_columns.forEach(() => dynamicCols.push({ wch: 15 }));
    }
    dynamicCols.push({ wch: 15 }); // for Internal II total

    ws["!cols"] = dynamicCols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P2");
    XLSX.writeFile(wb, "Presentation_2_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Presentation 2:", error);
    throw error;
  }
}

/**
 * PRESENTATION 3 Export
 * Columns: Group No | Student Name | Guide Name | Ident Module (10) | Coding (10) |
 *          Team Work (10) | Understanding (10) | Presentation (10) | Internal III (50)
 */
export async function exportPresentation3Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p3 = presentations.find((p) => p.name.endsWith("3"));

    if (!p3) {
      throw new Error("Presentation 3 not found");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    let groups =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p3.id, userId)
        : await getGroupsByPresentation(p3.id);

    // Filter by guide if specified
    if (guideFilter && guideFilter !== "all") {
      groups = groups.filter((g: any) => g.guide_name === guideFilter);
    }

    const rows: any[] = [];

    // Add header rows
    const headerRows = addHeaderRows(p3.name, academicYear);
    rows.push(...headerRows);

    const visibleCols = getExportColumns(p3, 3);
    const extraColumnHeaders = p3.extra_columns?.map(col => `${col.name} (${col.maxMark})`) || [];
    const totalMaxSum = visibleCols.reduce((sum, c) => sum + c.maxMark, 0) +
      (p3.extra_columns?.reduce((sum, col) => sum + col.maxMark, 0) || 0);

    // Column headers
    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols.map(c => `${c.name} (${c.maxMark})`),
      ...extraColumnHeaders, `Internal III (${totalMaxSum})`,
    ];
    rows.push(columnHeaders);

    const ROWS_PER_GROUP = 4;
    for (const group of groups) {
      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student = group.students[i];
        const evaluation = (student?.evaluation || {}) as Evaluation;

        const baseMarks = visibleCols.map(c => Number((evaluation as any)[c.key]) || 0);
        const extraMarksValues = p3.extra_columns?.map(col => evaluation.extra_marks?.[col.id] ?? 0) || [];
        const totalObtained = baseMarks.reduce((a, b) => a + b, 0) + extraMarksValues.reduce((a, b) => a + b, 0);

        rows.push([
          group.group_number, student?.student_name || "", group.guide_name,
          ...baseMarks, ...extraMarksValues, totalObtained,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add merges for header rows
    if (!ws["!merges"]) {
      ws["!merges"] = [];
    }
    const colCount = columnHeaders.length;
    // Merge header rows dynamically (now 2 lines long)
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length,
      colCount,
      headerRows.length + 1,
    );
    addGroupMerges(ws, groups, headerRows.length + 1, ROWS_PER_GROUP, colCount);

    // Set column widths
    const dynamicCols = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    // Add widths for extra columns
    if (p3.extra_columns) {
      p3.extra_columns.forEach(() => dynamicCols.push({ wch: 15 }));
    }
    dynamicCols.push({ wch: 15 }); // for Internal III total

    ws["!cols"] = dynamicCols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P3");
    XLSX.writeFile(wb, "Presentation_3_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Presentation 3:", error);
    throw error;
  }
}

/**
 * PRESENTATION 4 Export
 * Columns: Group No | Student Name | Guide Name | Testing (10) | Participation (10) |
 *          Publication (10) | Project Report (20) | Internal IV (50) | Total (100) | Total (50)
 */
export async function exportPresentation4Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
  guideFilter?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p4 = presentations.find((p) => p.name.endsWith("4"));

    if (!p4) {
      throw new Error("Presentation 4 not found");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    let groups =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p4.id, userId)
        : await getGroupsByPresentation(p4.id);

    // Filter by guide if specified
    if (guideFilter && guideFilter !== "all") {
      groups = groups.filter((g: any) => g.guide_name === guideFilter);
    }

    const rows: any[] = [];

    // Add header rows
    const headerRows = addHeaderRows(p4.name, academicYear);
    rows.push(...headerRows);

    const visibleCols = getExportColumns(p4, 4);
    const extraColumnHeaders = p4.extra_columns?.map(col => `${col.name} (${col.maxMark})`) || [];
    const totalMaxSum = visibleCols.reduce((sum, c) => sum + c.maxMark, 0) +
      (p4.extra_columns?.reduce((sum, col) => sum + col.maxMark, 0) || 0);

    // Column headers
    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols.map(c => `${c.name} (${c.maxMark})`),
      ...extraColumnHeaders, `Internal IV (${totalMaxSum})`,
    ];
    rows.push(columnHeaders);

    const ROWS_PER_GROUP = 4;
    for (const group of groups) {
      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student = group.students[i];
        const evaluation = (student?.evaluation || {}) as Evaluation;

        const baseMarks = visibleCols.map(c => Number((evaluation as any)[c.key]) || 0);
        const extraMarksValues = p4.extra_columns?.map(col => evaluation.extra_marks?.[col.id] ?? 0) || [];
        const totalObtained = baseMarks.reduce((a, b) => a + b, 0) + extraMarksValues.reduce((a, b) => a + b, 0);

        rows.push([
          group.group_number, student?.student_name || "", group.guide_name,
          ...baseMarks, ...extraMarksValues, totalObtained,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add merges for header rows
    if (!ws["!merges"]) {
      ws["!merges"] = [];
    }
    const colCount = columnHeaders.length;
    // Merge header rows dynamically (now 2 lines long)
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length,
      colCount,
      headerRows.length + 1,
    );
    addGroupMerges(ws, groups, headerRows.length + 1, ROWS_PER_GROUP, colCount);

    // Set column widths
    const dynamicCols = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    // Add widths for extra columns
    if (p4.extra_columns) {
      p4.extra_columns.forEach(() => dynamicCols.push({ wch: 15 }));
    }
    dynamicCols.push({ wch: 15 }); // for Internal IV total

    ws["!cols"] = dynamicCols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P4");
    XLSX.writeFile(wb, "Presentation_4_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Presentation 4:", error);
    throw error;
  }
}

/**
 * SEMESTER 7 Report (Combined P1 + P2)
 * Combines all columns from Presentation 1 and Presentation 2
 */
export async function exportSemester1Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p1 = presentations.find((p) => p.name.endsWith("1"));
    const p2 = presentations.find((p) => p.name.endsWith("2"));

    if (!p1 || !p2) {
      throw new Error("Presentation 1 or 2 not found");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    const groups1 =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p1.id, userId)
        : await getGroupsByPresentation(p1.id);
    const groups2 =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p2.id, userId)
        : await getGroupsByPresentation(p2.id);

    const groupMap = new Map<number, any>();
    groups1.forEach((g) => groupMap.set(g.group_number, g));

    const rows: any[] = [];

    // Add header rows
    const headerRows = addHeaderRows("Semester 7", academicYear);
    rows.push(...headerRows);

    const visibleCols1 = getExportColumns(p1, 1);
    const extraCols1 = p1.extra_columns || [];
    const totalMax1 = visibleCols1.reduce((s, c) => s + c.maxMark, 0) + extraCols1.reduce((s, c) => s + c.maxMark, 0);

    const visibleCols2 = getExportColumns(p2, 2);
    const extraCols2 = p2.extra_columns || [];
    const totalMax2 = visibleCols2.reduce((s, c) => s + c.maxMark, 0) + extraCols2.reduce((s, c) => s + c.maxMark, 0);

    // Column headers
    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols1.map(c => `${c.name} (${c.maxMark})`),
      ...extraCols1.map(c => `${c.name} (${c.maxMark})`),
      `Internal I (${totalMax1})`,
      ...visibleCols2.map(c => `${c.name} (${c.maxMark})`),
      ...extraCols2.map(c => `${c.name} (${c.maxMark})`),
      `Internal II (${totalMax2})`,
      "Total", "Total (50)"
    ];
    rows.push(columnHeaders);

    // Data rows (fixed 4-row blocks per group)
    const ROWS_PER_GROUP = 4;
    for (const group1 of groups1) {
      const group2 = groups2.find(
        (g) => g.group_number === group1.group_number,
      );

      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student1 = group1.students[i];
        const student2 = group2?.students[i];

        const eval1 = (student1?.evaluation || {}) as Evaluation;
        const eval2 = (student2?.evaluation || {}) as Evaluation;

        const baseMarks1 = visibleCols1.map(c => Number((eval1 as any)[c.key]) || 0);
        const extraMarks1 = extraCols1.map(c => Number(eval1.extra_marks?.[c.id]) || 0);
        const internalI = baseMarks1.reduce((a, b) => a + b, 0) + extraMarks1.reduce((a, b) => a + b, 0);

        const baseMarks2 = visibleCols2.map(c => Number((eval2 as any)[c.key]) || 0);
        const extraMarks2 = extraCols2.map(c => Number(eval2.extra_marks?.[c.id]) || 0);
        const internalII = baseMarks2.reduce((a, b) => a + b, 0) + extraMarks2.reduce((a, b) => a + b, 0);

        const totalObtained = internalI + internalII;
        const totalScaled = totalObtained / 2; // Keep scaling for now, assuming 50+50 base

        rows.push([
          group1.group_number,
          student1?.student_name || student2?.student_name || "",
          group1.guide_name,
          ...baseMarks1, ...extraMarks1, internalI,
          ...baseMarks2, ...extraMarks2, internalII,
          totalObtained, totalScaled,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add merges for header rows
    if (!ws["!merges"]) {
      ws["!merges"] = [];
    }
    const colCount = columnHeaders.length;
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length,
      colCount,
      headerRows.length + 1,
    );
    addGroupMergesForSemester(
      ws,
      groups1,
      groups2,
      headerRows.length + 1,
      ROWS_PER_GROUP,
      colCount,
    );

    // Set column widths
    ws["!cols"] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Semester 1");
    XLSX.writeFile(wb, "Semester_1_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Semester 1 Report:", error);
    throw error;
  }
}

/**
 * SEMESTER 8 Report (Combined P3 + P4)
 * Combines all columns from Presentation 3 and Presentation 4
 */
export async function exportSemester2Report(
  academicYearId: string,
  userId?: string,
  userRole?: string,
): Promise<void> {
  try {
    const presentations = await getPresentationsByAcademicYear(academicYearId);
    const p3 = presentations.find((p) => p.name.endsWith("3"));
    const p4 = presentations.find((p) => p.name.endsWith("4"));

    if (!p3 || !p4) {
      throw new Error("Presentation 3 or 4 not found");
    }

    // Get academic year info
    const academicYear = await getAcademicYear(academicYearId);

    const groups3 =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p3.id, userId)
        : await getGroupsByPresentation(p3.id);
    const groups4 =
      userRole === "teacher" && userId
        ? await getGroupsByPresentationForTeacher(p4.id, userId)
        : await getGroupsByPresentation(p4.id);

    const rows: any[] = [];

    // Add header rows
    const headerRows = addHeaderRows("Semester 8", academicYear);
    rows.push(...headerRows);

    const visibleCols3 = getExportColumns(p3, 3);
    const extraCols3 = p3.extra_columns || [];
    const totalMax3 = visibleCols3.reduce((s, c) => s + c.maxMark, 0) + extraCols3.reduce((s, c) => s + c.maxMark, 0);

    const visibleCols4 = getExportColumns(p4, 4);
    const extraCols4 = p4.extra_columns || [];
    const totalMax4 = visibleCols4.reduce((s, c) => s + c.maxMark, 0) + extraCols4.reduce((s, c) => s + c.maxMark, 0);

    // Column headers
    const columnHeaders = [
      "Group No", "Student Name", "Guide Name",
      ...visibleCols3.map(c => `${c.name} (${c.maxMark})`),
      ...extraCols3.map(c => `${c.name} (${c.maxMark})`),
      `Internal III (${totalMax3})`,
      ...visibleCols4.map(c => `${c.name} (${c.maxMark})`),
      ...extraCols4.map(c => `${c.name} (${c.maxMark})`),
      `Internal IV (${totalMax4})`,
      "Total", "Total (50)"
    ];
    rows.push(columnHeaders);

    // Data rows (fixed 4-row blocks per group)
    const ROWS_PER_GROUP = 4;
    for (const group3 of groups3) {
      const group4 = groups4.find(
        (g) => g.group_number === group3.group_number,
      );

      for (let i = 0; i < ROWS_PER_GROUP; i++) {
        const student3 = group3.students[i];
        const student4 = group4?.students[i];

        const eval3 = (student3?.evaluation || {}) as Evaluation;
        const eval4 = (student4?.evaluation || {}) as Evaluation;

        const baseMarks3 = visibleCols3.map(c => Number((eval3 as any)[c.key]) || 0);
        const extraMarks3 = extraCols3.map(c => Number(eval3.extra_marks?.[c.id]) || 0);
        const internalIII = baseMarks3.reduce((a, b) => a + b, 0) + extraMarks3.reduce((a, b) => a + b, 0);

        const baseMarks4 = visibleCols4.map(c => Number((eval4 as any)[c.key]) || 0);
        const extraMarks4 = extraCols4.map(c => Number(eval4.extra_marks?.[c.id]) || 0);
        const internalIV = baseMarks4.reduce((a, b) => a + b, 0) + extraMarks4.reduce((a, b) => a + b, 0);

        const totalObtained = internalIII + internalIV;
        const totalScaled = totalObtained / 2; // Keep scaling for now, assuming 50+50 base

        rows.push([
          group3.group_number,
          student3?.student_name || student4?.student_name || "",
          group3.guide_name,
          ...baseMarks3, ...extraMarks3, internalIII,
          ...baseMarks4, ...extraMarks4, internalIV,
          totalObtained, totalScaled,
        ]);
      }
      // Add spacer row
      rows.push(Array(columnHeaders.length).fill(""));
    }

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Add merges for header rows
    if (!ws["!merges"]) {
      ws["!merges"] = [];
    }
    const colCount = columnHeaders.length;
    for (let r = 0; r < headerRows.length; r++) {
      ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: colCount - 1 } });
    }

    applyProfessionalFormattingToWorksheet(
      ws,
      rows.length,
      colCount,
      headerRows.length + 1,
    );
    addGroupMergesForSemester(
      ws,
      groups3,
      groups4,
      headerRows.length + 1,
      ROWS_PER_GROUP,
      colCount,
    );

    // Set column widths
    ws["!cols"] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Semester 2");
    XLSX.writeFile(wb, "Semester_2_Report.xlsx");
  } catch (error) {
    console.error("Error exporting Semester 2 Report:", error);
    throw error;
  }
}
