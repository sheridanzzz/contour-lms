import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { createConsultation, listConsultations, updateConsultation } from "./service";

// The service takes its Supabase client as a parameter (dependency injection),
// so its logic is testable with a fake: no database, no network.

type Reply = { data?: unknown; error?: unknown; count?: number | null };

/** A chainable stand-in for the query builder: records every call, replies in order. */
function fakeClient(replies: Reply[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  let next = 0;
  const builder: object = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "then") {
          const reply = { data: null, error: null, count: null, ...replies[next++] };
          return (resolve: (value: Reply) => void) => resolve(reply);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return builder;
        };
      },
    },
  );
  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
  } as unknown as SupabaseClient<Database>;
  const argsOf = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);
  return { client, argsOf };
}

const row = {
  id: "c1",
  student_id: "s1",
  first_name: "Ann",
  last_name: "Lee",
  reason: "Maths",
  scheduled_at: "2030-01-01T00:00:00Z",
  status: "booked",
  created_at: "2029-12-01T00:00:00Z",
  updated_at: "2029-12-01T00:00:00Z",
};

describe("listConsultations", () => {
  it("filters, paginates and maps rows to the camelCase API shape (no owner id)", async () => {
    const { client, argsOf } = fakeClient([{ data: [row], count: 41 }]);

    const result = await listConsultations(client, { page: 3, pageSize: 20, status: "booked", studentId: "s1" });

    expect(argsOf("match")).toEqual([[{ student_id: "s1", status: "booked" }]]);
    expect(argsOf("range")).toEqual([[40, 59]]);
    expect(result).toEqual({
      error: null,
      data: {
        page: 3,
        pageSize: 20,
        total: 41,
        data: [
          {
            id: "c1",
            firstName: "Ann",
            lastName: "Lee",
            reason: "Maths",
            scheduledAt: "2030-01-01T00:00:00Z",
            status: "booked",
            createdAt: "2029-12-01T00:00:00Z",
            updatedAt: "2029-12-01T00:00:00Z",
          },
        ],
      },
    });
  });

  it("treats a page past the end (PGRST103) as empty and fetches the real total", async () => {
    const { client, argsOf } = fakeClient([{ error: { code: "PGRST103" } }, { count: 7 }]);

    const result = await listConsultations(client, { page: 9, pageSize: 20 });

    expect(result).toEqual({ error: null, data: { data: [], page: 9, pageSize: 20, total: 7 } });
    expect(argsOf("select")[1]).toEqual(["*", { count: "exact", head: true }]);
  });

  it("passes other database errors back to the caller", async () => {
    const error = { code: "XX000", message: "boom" };
    const { client } = fakeClient([{ error }]);
    expect(await listConsultations(client, { page: 1, pageSize: 20 })).toEqual({ data: null, error });
  });
});

describe("createConsultation", () => {
  it("sends only the four booking fields: owner and status come from the database", async () => {
    const { client, argsOf } = fakeClient([{ data: row }]);

    await createConsultation(client, {
      firstName: "Ann",
      lastName: "Lee",
      reason: "Maths",
      scheduledAt: "2030-01-01T00:00:00Z",
    });

    expect(argsOf("insert")).toEqual([
      [{ first_name: "Ann", last_name: "Lee", reason: "Maths", scheduled_at: "2030-01-01T00:00:00Z" }],
    ]);
  });
});

describe("updateConsultation", () => {
  it("scopes the update to the row and its owner, and reports a missing row as null", async () => {
    const { client, argsOf } = fakeClient([{ data: null }]);

    const result = await updateConsultation(client, { id: "c1", studentId: "s1", patch: { status: "cancelled" } });

    expect(argsOf("eq")).toEqual([
      ["id", "c1"],
      ["student_id", "s1"],
    ]);
    expect(result).toEqual({ data: null, error: null });
  });
});
