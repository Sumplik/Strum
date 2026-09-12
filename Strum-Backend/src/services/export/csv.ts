export type CsvDelimiter = "," | ";";

export type CellValue = string | number | null | undefined;

const NEEDS_QUOTES = /[",;\r\n]/;

export function escapeCsvCell(value: CellValue, delimiter: CsvDelimiter): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? String(value) : value;
  return NEEDS_QUOTES.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(cells: CellValue[], delimiter: CsvDelimiter): string {
  return cells.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter) + "\r\n";
}

// BOM + CRLF so Excel detects UTF-8 and line breaks correctly.
export function csvStream(
  headers: string[],
  rows: AsyncIterable<CellValue[]> | Iterable<CellValue[]>,
  delimiter: CsvDelimiter = ",",
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = (async function* () {
    yield encoder.encode("﻿" + csvLine(headers, delimiter));
    for await (const row of rows) {
      yield encoder.encode(csvLine(row, delimiter));
    }
  })();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel() {
      iterator.return(undefined);
    },
  });
}
