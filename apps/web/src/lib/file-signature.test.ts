import { describe, expect, it } from "vitest";
import { detectType } from "./file-signature";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("detectType", () => {
  it("detects zip-based pptx", () => {
    expect(detectType(bytes(0x50, 0x4b, 0x03, 0x04))).toBe("pptx");
  });

  it("detects legacy ppt", () => {
    expect(detectType(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe("ppt");
  });

  it("detects pdf", () => {
    expect(detectType(new Uint8Array(Buffer.from("%PDF-1.7")))).toBe("pdf");
  });

  it("detects png and jpeg", () => {
    expect(detectType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("detects executable web content", () => {
    expect(detectType(new Uint8Array(Buffer.from("<!DOCTYPE html>")))).toBe("html");
    expect(detectType(new Uint8Array(Buffer.from("<svg xmlns=")))).toBe("svg");
  });

  it("returns unknown for arbitrary bytes", () => {
    expect(detectType(bytes(0x00, 0x01, 0x02, 0x03))).toBe("unknown");
  });
});
