import { NextResponse, type NextRequest } from "next/server";
import { dbError, readJson, requireStudent, validationError } from "@/lib/api";
import { createConsultationSchema, listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { createConsultation, listConsultations } from "@/lib/consultations/service";

// GET /api/consultations?status=&page=&pageSize=  -> the caller's consultations
export async function GET(request: NextRequest) {
  const { user, response } = await requireStudent();
  if (response) return response;

  const query = listConsultationsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) return validationError(query.error);

  const result = await listConsultations(user.supabase, { ...query.data, studentId: user.userId });
  if (result.error) return dbError(result.error);
  return NextResponse.json(result.data);
}

// POST /api/consultations  -> book a consultation for the caller
export async function POST(request: NextRequest) {
  const { user, response } = await requireStudent();
  if (response) return response;

  const body = createConsultationSchema.safeParse(await readJson(request));
  if (!body.success) return validationError(body.error);

  const result = await createConsultation(user.supabase, body.data);
  if (result.error) return dbError(result.error);
  return NextResponse.json({ data: result.data }, { status: 201 });
}
