import { NextResponse, type NextRequest } from "next/server";
import { dbError, requireAdmin, validationError } from "@/lib/api";
import { listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { listConsultations } from "@/lib/consultations/service";

// GET /api/admin/consultations?status=&page=&pageSize=  -> every consultation (admins only)
export async function GET(request: NextRequest) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const query = listConsultationsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) return validationError(query.error);

  const result = await listConsultations(user.supabase, query.data);
  if (result.error) return dbError(result.error);
  return NextResponse.json(result.data);
}
