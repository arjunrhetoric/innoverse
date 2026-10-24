/**
 * Development-only escape hatches. These are hard-disabled in production
 * regardless of environment variables.
 */
export function testBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_TEST_STARTUP_BYPASS === "true"
  );
}
