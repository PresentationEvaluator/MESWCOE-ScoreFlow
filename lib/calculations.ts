import { Evaluation, CalculatedMarks } from './types';

// Presentation 1: Problem ID (10) + Literature (10) + Software Eng (10) + Req Analysis (10) + SRS (10) = 50
export function calculateInternalPresentation1(evaluation: Partial<Evaluation>): number {
    const sum = (
        (evaluation.problem_identification || 0) +
        (evaluation.literature_survey || 0) +
        (evaluation.software_engineering || 0) +
        (evaluation.requirement_analysis || 0) +
        (evaluation.srs || 0)
    );
    return Math.min(sum, 50);
}

// Presentation 2: Individual (10) + Team Work (10) + Presentation (10) + Paper (20) = 50
export function calculateInternalPresentation2(evaluation: Partial<Evaluation>): number {
    const sum = (
        (evaluation.individual_capacity || 0) +
        (evaluation.team_work || 0) +
        (evaluation.presentation_qa || 0) +
        (evaluation.paper_presentation || 0)
    );
    return Math.min(sum, 50);
}

// Presentation 3: Identification (10) + Coding (10) + Team Work (10) + Understanding (10) + Presentation (10) = 50
export function calculateInternalPresentation3(evaluation: Partial<Evaluation>): number {
    const sum = (
        (evaluation.identification_module || 0) +
        (evaluation.coding || 0) +
        (evaluation.team_work || 0) +
        (evaluation.understanding || 0) +
        (evaluation.presentation_qa || 0)
    );
    return Math.min(sum, 50);
}

// Presentation 4: Testing (10) + Participation (10) + Publication (10) + Project Report (20) = 50
export function calculateInternalPresentation4(evaluation: Partial<Evaluation>): number {
    const sum = (
        (evaluation.testing || 0) +
        (evaluation.participation_conference || 0) +
        (evaluation.publication || 0) +
        (evaluation.project_report || 0)
    );
    return Math.min(sum, 50);
}

export function calculateTotalOut100(internal1: number, internal2: number): number {
    return internal1 + internal2;
}

export function getTotalOut50(total_out_of_100: number): number {
    return total_out_of_100 / 2;
}

/**
 * Calculate all marks at once
 */
export function calculateAllMarks(evaluation: Partial<Evaluation>): CalculatedMarks {
    const internal_presentation_i = calculateInternalPresentation1(evaluation);
    const internal_presentation_ii = calculateInternalPresentation2(evaluation);
    const internal_presentation_iii = calculateInternalPresentation3(evaluation);
    const internal_presentation_iv = calculateInternalPresentation4(evaluation);

    const total_out_of_100 = calculateTotalOut100(
        internal_presentation_i + internal_presentation_iii,
        internal_presentation_ii + internal_presentation_iv
    );

    const total_out_of_50 = getTotalOut50(total_out_of_100);

    return {
        internal_presentation_i,
        internal_presentation_ii,
        internal_presentation_iii,
        internal_presentation_iv,
        total_out_of_100,
        total_out_of_50,
    };
}

/**
 * Validate that a mark doesn't exceed its maximum
 */
export function validateMark(field: string, value: number): boolean {
    const maxValues: Record<string, number> = {
        problem_identification: 10,
        literature_survey: 10,
        software_engineering: 10,
        requirement_analysis: 10,
        srs: 10,
        individual_capacity: 10,
        team_work: 10,
        presentation_qa: 10,
        paper_presentation: 20,
        identification_module: 10,
        coding: 10,
        understanding: 10,
        internal_presentation_iii: 50,
        testing: 10,
        participation_conference: 10,
        publication: 10,
        project_report: 20,
        internal_presentation_iv: 50,
    };

    const max = maxValues[field];
    if (max === undefined) return true;

    return value >= 0 && value <= max;
}

/**
 * Get the maximum value for a field
 */
export function getMaxValue(field: string): number {
    const maxValues: Record<string, number> = {
        problem_identification: 10,
        literature_survey: 10,
        software_engineering: 10,
        requirement_analysis: 10,
        srs: 10,
        individual_capacity: 10,
        team_work: 10,
        presentation_qa: 10,
        paper_presentation: 20,
        identification_module: 10,
        coding: 10,
        understanding: 10,
        internal_presentation_iii: 50,
        testing: 10,
        participation_conference: 10,
        publication: 10,
        project_report: 20,
        internal_presentation_iv: 50,
    };

    return maxValues[field] || 0;
}
