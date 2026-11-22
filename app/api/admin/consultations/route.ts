import { NextResponse, type NextRequest } from "next/server";
import { dbError, parseQuery, requireAdmin, withErrorHandling } from "@/lib/api";
import { listConsultationsQuerySchema } from "@/lib/consultations/schema";
import { listConsultations } from "@/lib/consultations/service";

// GET /api/admin/consultations?status=&page=&pageSize=  -> every consultation (admins only)
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const query = parseQuery(request, listConsultationsQuerySchema);
  if (query.response) return query.response;

  const result = await listConsultations(user.supabase, query.data);
  if (result.error) return dbError(result.error);
  return NextResponse.json(result.data);
});
