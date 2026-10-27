import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("Innoverse2026");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(hash).not.toContain("Innoverse2026");
    expect(await verifyPassword("Innoverse2026", hash)).toBe(true);
  });

  it("rejects a wrong password and malformed hashes", async () => {
    const hash = await hashPassword("Innoverse2026");
    expect(await verifyPassword("Innoverse2027", hash)).toBe(false);
    expect(await verifyPassword("Innoverse2026", "not-a-hash")).toBe(false);
    expect(await verifyPassword("Innoverse2026", "scrypt:abc:def")).toBe(false);
  });

  it("enforces password rules", () => {
    expect(passwordProblem("short1")).toBeTruthy();
    expect(passwordProblem("alllettersonly")).toBeTruthy();
    expect(passwordProblem("1234567890")).toBeTruthy();
    expect(passwordProblem("Innoverse2026")).toBeNull();
  });
});
