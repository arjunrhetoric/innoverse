import { afterAll, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { readStoredBytes, uploadFile } from "./storage";

const created: string[] = [];

afterAll(() => {
  for (const rel of created) {
    try {
      fs.rmSync(path.join(process.cwd(), ".private-uploads", rel), { force: true });
    } catch {
      // ignore
    }
  }
});

describe("private storage fallback", () => {
  it("stores and reads a file without a Blob token", async () => {
    // No BLOB_READ_WRITE_TOKEN in the test environment → local fallback.
    const pointer = await uploadFile(
      Buffer.from("innoverse-local-file"),
      "test",
      "sample.txt",
      "text/plain"
    );

    expect(pointer.startsWith("local:")).toBe(true);
    created.push(pointer.slice("local:".length));

    const bytes = await readStoredBytes(pointer);
    expect(bytes.toString()).toBe("innoverse-local-file");
  });

  it("rejects missing plain paths", async () => {
    await expect(readStoredBytes("/does-not-exist/file.pdf")).rejects.toThrow();
  });
});
