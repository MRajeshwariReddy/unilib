import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchRelatedReadings } from "@/lib/openalex/client";

export const maxDuration = 10;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await context.params;

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Document ID is required." } },
      { status: 400 }
    );
  }

  // Supabase RLS Document lookup
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, subject, status")
    .eq("id", documentId)
    .single();

  if (!doc || doc.status !== "ready") {
    return NextResponse.json(
      { error: { code: "document_not_found", message: "Document not found or not visible." } },
      { status: 404 }
    );
  }

  const queryText = (doc.subject || doc.title || "").trim().slice(0, 200);

  const openAlexResult = await fetchRelatedReadings({
    queryText,
  });

  return NextResponse.json(openAlexResult, { status: 200 });
}
