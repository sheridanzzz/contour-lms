import type { PostgrestError } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiError, dbError, validationError, withErrorHandling } from "./api";

const pgError = (code: string, message = "boom") =>
  ({ code, message, details: "", hint: "", name: "PostgrestError" }) as unknown as PostgrestError;

afterEach(() => vi.restoreAllMocks());

describe("withErrorHandling", () => {
  it("passes the handler's response through untouched", async () => {
    const handler = withErrorHandling(async () => apiError(409, "conflict", "nope"));
    const res = await handler();
    expect(res.status).toBe(409);
  });

  it("turns an unexpected throw into a logged 500 in the shared shape", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandling(async (request: Request) => {
      throw new Error(`Supabase unreachable while handling ${request.method}`);
    });

    const res = await handler(new Request("http://test/api/consultations", { method: "POST" }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal_error", message: expect.any(String) },
    });
    expect(log).toHaveBeenCalledWith(
      "Unhandled API error",
      "POST",
      "http://test/api/consultations",
      expect.any(Error),
    );
  });
});

describe("dbError", () => {
  it.each([
    ["PT400", 400, "validation_error"],
    ["23514", 400, "validation_error"],
    ["PT409", 409, "conflict"],
    ["42501", 403, "forbidden"],
  ])("maps %s to %i %s", async (code, status, apiCode) => {
    const res = dbError(pgError(code));
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(apiCode);
  });

  it("hides unexpected database errors behind a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = dbError(pgError("XX000", "internal detail"));
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).not.toContain("internal detail");
  });
});

describe("validationError", () => {
  it("returns per-field messages", async () => {
    const parsed = z.object({ firstName: z.string().min(1, "Required") }).safeParse({ firstName: "" });
    const res = validationError(parsed.error!);
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields).toEqual({ firstName: ["Required"] });
  });
});
