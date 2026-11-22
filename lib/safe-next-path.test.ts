import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

const origin = "http://localhost:3000";

describe("safeNextPath", () => {
  it("keeps same-origin paths, with their query and hash", () => {
    expect(safeNextPath("/dashboard", origin)).toBe("/dashboard");
    expect(safeNextPath("/auth/update-password?x=1#top", origin)).toBe("/auth/update-password?x=1#top");
    expect(safeNextPath(`${origin}/admin`, origin)).toBe("/admin");
  });

  it.each([
    null,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "javascript:alert(1)",
    "http://[",
  ])("falls back to / for %j", (next) => {
    expect(safeNextPath(next, origin)).toBe("/");
  });
});
