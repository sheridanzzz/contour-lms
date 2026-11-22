import { NextResponse, type NextRequest } from "next/server";
import { dbError, parseBody, parseQuery, requireStudent, withErrorHandling } from "@/lib/api";
import { createConsultationSchema, listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { createConsultation, listConsultations } from "@/lib/consultations/service";

// GET /api/consultations?status=&page=&pageSize=  -> the caller's consultations
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, response } = await requireStudent();
  if (response) return response;

  const query = parseQuery(request, listConsultationsQuerySchema);
  if (query.response) return query.response;

  const result = await listConsultations(user.supabase, { ...query.data, studentId: user.userId });
  if (result.error) return dbError(result.error);
  return NextResponse.json(result.data);
});

// POST /api/consultations  -> book a consultation for the caller
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { user, response } = await requireStudent();
  if (response) return response;

  const body = await parseBody(request, createConsultationSchema);
  if (body.response) return body.response;

  const result = await createConsultation(user.supabase, body.data);
  if (result.error) return dbError(result.error);
  return NextResponse.json({ data: result.data }, { status: 201 });
});
