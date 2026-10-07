/*
 * Minimal RFC 4180 CSV writer.
 *
 * The leading-apostrophe guard is not cosmetic: a lead whose name starts with
 * an equals or at sign would otherwise be executed as a formula when the
 * export is opened in Excel or Sheets, which is a live injection path into the
 * sales team's laptops.
 */
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_PREFIXES.has(text[0])) text = `'${text}`;
  if (/["\n\r,]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label ?? column.key)).join(',');
  const body = rows.map((row) =>
    columns
      .map((column) => escapeCell(column.value ? column.value(row) : row[column.key]))
      .join(','),
  );
  // BOM so Excel opens UTF-8 exports without mangling non-ASCII names.
  return `﻿${[header, ...body].join('\r\n')}\r\n`;
}
