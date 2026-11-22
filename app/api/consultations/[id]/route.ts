import { NextResponse, type NextRequest } from "next/server";
import { apiError, dbError, parse, parseBody, requireStudent, withErrorHandling } from "@/lib/api";
import { consultationIdSchema, updateConsultationSchema } from "@/lib/consultations/schema";
import { updateConsultation } from "@/lib/consultations/service";

// PATCH /api/consultations/:id
//   { scheduledAt }                          -> reschedule
//   { status: completed | booked | cancelled } -> complete, reopen, cancel
// Transition rules live in the database trigger and surface here as 409.
export const PATCH = withErrorHandling(
  async (request: NextRequest, ctx: RouteContext<"/api/consultations/[id]">) => {
    const { user, response } = await requireStudent();
    if (response) return response;

    const id = parse(consultationIdSchema, (await ctx.params).id);
    if (id.response) return id.response;

    const body = await parseBody(request, updateConsultationSchema);
    if (body.response) return body.response;

    const result = await updateConsultation(user.supabase, {
      id: id.data,
      studentId: user.userId,
      patch: body.data,
    });
    if (result.error) return dbError(result.error);
    // Missing and "belongs to someone else" look the same, so IDs never leak.
    if (!result.data) return apiError(404, "not_found", "Consultation not found");
    return NextResponse.json({ data: result.data });
  },
);
