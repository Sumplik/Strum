import { describe, expect, it } from "bun:test";
import { unzipSync, strFromU8 } from "fflate";
import { csvLine, csvStream, escapeCsvCell } from "./csv";
import { buildXlsx } from "./xlsx";

async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

describe("csv", () => {
  it("quotes only when needed and doubles embedded quotes", () => {
    expect(escapeCsvCell('W1 "main"', ",")).toBe('"W1 ""main"""');
    expect(escapeCsvCell("a,b", ",")).toBe('"a,b"');
    expect(escapeCsvCell("plain", ",")).toBe("plain");
    expect(escapeCsvCell(null, ",")).toBe("");
    expect(escapeCsvCell(1.5, ";")).toBe("1.5");
    expect(csvLine(["a", 1, null], ";")).toBe("a;1;\r\n");
  });

  it("streams a BOM, header and rows", async () => {
    const text = await readStream(csvStream(["Waktu", "Arus"], [["2026-09-12 08:00:00", 25.4]]));
    expect(text).toBe("﻿Waktu,Arus\r\n2026-09-12 08:00:00,25.4\r\n");
  });
});

describe("xlsx", () => {
  it("produces a zip with a valid worksheet, header style and inline strings", () => {
    const bytes = buildXlsx([
      {
        name: "Log UP2W1",
        columns: [{ header: "Waktu" }, { header: "Arus (A)" }],
        rows: [
          ["2026-09-12 08:00:00", 25.4],
          ["a <b> & \"c\"", null],
        ],
      },
    ]);

    const files = unzipSync(bytes);
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);

    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Waktu</t></is></c>');
    expect(sheet).toContain('<c r="B2"><v>25.4</v></c>');
    expect(sheet).toContain("a &lt;b&gt; &amp; &quot;c&quot;");
    expect(sheet).not.toContain('<c r="B3"');
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Log UP2W1"');
  });
});
