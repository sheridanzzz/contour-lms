import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, callApi } from "./api-client";

const reply = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("callApi", () => {
  it("returns data on success", async () => {
    vi.stubGlobal("fetch", reply(201, { data: { id: "1" } }));
    expect(await callApi("/api/x", "POST", {})).toEqual({ data: { data: { id: "1" } }, error: null });
  });

  it("turns an API error into an ApiError with status, message and field errors", async () => {
    vi.stubGlobal(
      "fetch",
      reply(400, { error: { code: "validation_error", message: "Fix it", fields: { reason: ["Required"] } } }),
    );
    const { data, error } = await callApi("/api/x", "POST", {});
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: "Fix it", fields: { reason: ["Required"] } });
  });

  it("handles a non-JSON error reply", async () => {
    vi.stubGlobal("fetch", reply(502, "<html>Bad gateway</html>"));
    const { error } = await callApi("/api/x", "PATCH", {});
    expect(error).toMatchObject({ status: 502, fields: {} });
    expect(error?.message).toMatch(/something went wrong/i);
  });

  it("turns a network failure into an ApiError instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { error } = await callApi("/api/x", "POST", {});
    expect(error).toMatchObject({ status: 0 });
    expect(error?.message).toMatch(/can't reach the server/i);
  });
});
