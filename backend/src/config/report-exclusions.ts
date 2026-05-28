/**
 * Employees excluded from daily report submission and team aggregation.
 * Add employeeNo values here to hide a user from:
 *   - 취합본 (daily aggregation view)
 *   - 주간요약 (weekly summary)
 *   - 보고서 제출 (report submission — returns REPORT_EXCLUDED error)
 */
export const REPORT_EXCLUDED_NOS: string[] = ['bykim', '241001']
