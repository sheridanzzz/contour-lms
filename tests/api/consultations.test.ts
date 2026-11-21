import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, hoursAgo, inDays, listAll, signIn } from "./helpers";

// Integration tests for every /api route: real HTTP, real sessions, real RLS.
// Each run tags its rows so it never depends on seed data or earlier runs.

const tag = `itest-${Date.now()}`;
let alice = "";
let bob = "";
let admin = "";

const booking = (overrides: Record<string, unknown> = {}) => ({
  firstName: "Alice",
  lastName: "Nguyen",
  reason: `${tag} maths`,
  scheduledAt: inDays(2),
  ...overrides,
});

async function book(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await api("/api/consultations", { method: "POST", cookie, body: booking(overrides) });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; status: string; scheduledAt: string };
}

function expectError(res: Awaited<ReturnType<typeof api>>, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.body).toMatchObject({ error: { code, message: expect.any(String) } });
}

beforeAll(async () => {
  [alice, bob, admin] = await Promise.all([
    signIn("alice@example.com"),
    signIn("bob@example.com"),
    signIn("admin@example.com"),
  ]);
});

describe("authentication", () => {
  it.each([
    ["GET", "/api/consultations"],
    ["POST", "/api/consultations"],
    ["PATCH", `/api/consultations/${randomUUID()}`],
    ["GET", "/api/admin/consultations"],
  ])("%s %s without a session returns 401", async (method, path) => {
    const res = await api(path, { method, body: method === "GET" ? undefined : booking() });
    expectError(res, 401, "unauthorized");
  });
});

describe("POST /api/consultations", () => {
  it("books a consultation owned by the caller, starting as booked", async () => {
    const res = await api("/api/consultations", { method: "POST", cookie: alice, body: booking() });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      firstName: "Alice",
      lastName: "Nguyen",
      reason: `${tag} maths`,
      status: "booked",
    });
    expect(res.body.data).not.toHaveProperty("studentId");
  });

  it("returns field errors for missing fields", async () => {
    const res = await api("/api/consultations", { method: "POST", cookie: alice, body: {} });
    expectError(res, 400, "validation_error");
    expect(Object.keys(res.body.error.fields)).toEqual(
      expect.arrayContaining(["firstName", "lastName", "reason", "scheduledAt"]),
    );
  });

  it.each([
    ["a time in the past", { scheduledAt: hoursAgo(1) }],
    ["a date that is not ISO 8601", { scheduledAt: "next tuesday" }],
    ["a blank name", { firstName: "   " }],
    ["a reason over 1000 characters", { reason: "x".repeat(1001) }],
    ["a client-set owner", { studentId: randomUUID() }],
    ["a client-set status", { status: "completed" }],
  ])("rejects %s", async (_, overrides) => {
    const res = await api("/api/consultations", { method: "POST", cookie: alice, body: booking(overrides) });
    expectError(res, 400, "validation_error");
  });

  it("rejects a body that is not JSON", async () => {
    const res = await api("/api/consultations", { method: "POST", cookie: alice, rawBody: "{nope" });
    expectError(res, 400, "validation_error");
  });

  it("forbids admins from booking", async () => {
    const res = await api("/api/consultations", { method: "POST", cookie: admin, body: booking() });
    expectError(res, 403, "forbidden");
  });
});

describe("GET /api/consultations", () => {
  it("returns only the caller's consultations", async () => {
    const mine = await book(alice);
    const bobs = await book(bob, { firstName: "Bob", reason: `${tag} bob only` });
    const ids = (await listAll("/api/consultations", alice)).map((c) => c.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(bobs.id);
  });

  it("returns the page envelope and filters by status", async () => {
    const res = await api("/api/consultations?status=booked&pageSize=5", { cookie: alice });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 5, total: expect.any(Number) });
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.data.every((c: { status: string }) => c.status === "booked")).toBe(true);
  });

  it("returns an empty page, with the real total, past the last page", async () => {
    const res = await api("/api/consultations?page=9999", { cookie: alice });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it.each(["pageSize=101", "page=0", "status=deleted"])("rejects ?%s", async (query) => {
    const res = await api(`/api/consultations?${query}`, { cookie: alice });
    expectError(res, 400, "validation_error");
  });

  it("forbids admins (they use the admin endpoint)", async () => {
    expectError(await api("/api/consultations", { cookie: admin }), 403, "forbidden");
  });
});

describe("PATCH /api/consultations/:id", () => {
  let id = "";
  const patch = (body: unknown, cookie = alice, target = id) =>
    api(`/api/consultations/${target}`, { method: "PATCH", cookie, body });

  beforeEach(async () => {
    id = (await book(alice)).id;
  });

  it("marks complete and back to booked", async () => {
    expect((await patch({ status: "completed" })).body.data.status).toBe("completed");
    expect((await patch({ status: "booked" })).body.data.status).toBe("booked");
  });

  it("reschedules a booked consultation to a future time", async () => {
    const scheduledAt = inDays(5);
    const res = await patch({ scheduledAt });
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.scheduledAt).getTime()).toBe(new Date(scheduledAt).getTime());
  });

  it("refuses to reschedule a completed consultation", async () => {
    await patch({ status: "completed" });
    expectError(await patch({ scheduledAt: inDays(5) }), 409, "conflict");
  });

  it("cancels, and cancelled is final", async () => {
    expect((await patch({ status: "cancelled" })).body.data.status).toBe("cancelled");
    expectError(await patch({ status: "booked" }), 409, "conflict");
    expectError(await patch({ status: "completed" }), 409, "conflict");
    expectError(await patch({ scheduledAt: inDays(5) }), 409, "conflict");
  });

  it("refuses to cancel a completed consultation", async () => {
    await patch({ status: "completed" });
    expectError(await patch({ status: "cancelled" }), 409, "conflict");
  });

  it.each([
    ["an empty body", {}],
    ["two changes at once", { status: "completed", scheduledAt: inDays(5) }],
    ["a past time", { scheduledAt: hoursAgo(1) }],
    ["an unknown status", { status: "deleted" }],
    ["an unknown field", { reason: "edited" }],
  ])("rejects %s", async (_, body) => {
    expectError(await patch(body), 400, "validation_error");
  });

  it("rejects a malformed id", async () => {
    expectError(await patch({ status: "completed" }, alice, "not-a-uuid"), 400, "validation_error");
  });

  it("returns 404 for another student's consultation and for unknown ids", async () => {
    expectError(await patch({ status: "cancelled" }, bob), 404, "not_found");
    expectError(await patch({ status: "cancelled" }, alice, randomUUID()), 404, "not_found");
    // Bob's attempt changed nothing.
    expect((await patch({ status: "completed" })).body.data.status).toBe("completed");
  });

  it("forbids admins (read-only)", async () => {
    expectError(await patch({ status: "completed" }, admin), 403, "forbidden");
  });
});

describe("GET /api/admin/consultations", () => {
  it("forbids students", async () => {
    expectError(await api("/api/admin/consultations", { cookie: alice }), 403, "forbidden");
  });

  it("lists consultations from every student", async () => {
    const a = await book(alice, { reason: `${tag} admin view a` });
    const b = await book(bob, { firstName: "Bob", reason: `${tag} admin view b` });
    const ids = (await listAll("/api/admin/consultations", admin)).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  it("filters by status and paginates", async () => {
    const res = await api("/api/admin/consultations?status=booked&page=2&pageSize=1", { cookie: admin });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, pageSize: 1 });
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.data.every((c: { status: string }) => c.status === "booked")).toBe(true);
  });

  it("rejects bad query params", async () => {
    expectError(await api("/api/admin/consultations?pageSize=0", { cookie: admin }), 400, "validation_error");
  });
});
