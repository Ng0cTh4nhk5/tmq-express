/**
 * Date utilities for VN timezone (UTC+7)
 * PostgreSQL stores dates as UTC. All frontend inputs are "YYYY-MM-DD" local VN dates.
 */

/**
 * Parse "YYYY-MM-DD" string as start of day in Vietnam timezone (UTC+7)
 * e.g. "2026-05-15" → 2026-05-15T00:00:00+07:00 → stored as 2026-05-14T17:00:00Z
 */
export function parseStartOfDayVN(dateStr) {
  return new Date(dateStr + 'T00:00:00+07:00');
}

/**
 * Parse "YYYY-MM-DD" string as end of day in Vietnam timezone (UTC+7)
 * e.g. "2026-05-15" → 2026-05-15T23:59:59.999+07:00 → stored as 2026-05-15T16:59:59.999Z
 */
export function parseEndOfDayVN(dateStr) {
  return new Date(dateStr + 'T23:59:59.999+07:00');
}

/**
 * Trả về { start, end } cho một tháng theo VN timezone.
 * start = ngày 1 00:00:00 VN, end = ngày cuối tháng 23:59:59.999 VN
 * @param {number} year  — năm (e.g. 2026)
 * @param {number} month — tháng 1-12
 */
export function monthBoundaryVN(year, month) {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+07:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}
