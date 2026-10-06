import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Reader, type BlockItem } from "@/components/reader/Reader";

export const runtime = "nodejs";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch document under RLS
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*, profiles:owner_id(display_name, user_type)")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    notFound();
  }

  // Check if document is ready or viewed by owner
  const isOwner = user && doc.owner_id === user.id;
  if (doc.status !== "ready" && !isOwner) {
    notFound();
  }

  // 2. Fetch all blocks paginated 1,000 per request
  let allBlocks: BlockItem[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: rawBlocks, error: blocksError } = await supabase
      .from("blocks")
      .select("id, position, type, heading_level, text")
      .eq("document_id", id)
      .order("position", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (blocksError || !rawBlocks || rawBlocks.length === 0) {
      break;
    }

    const mapped: BlockItem[] = rawBlocks.map((b) => ({
      id: b.id,
      position: b.position,
      type: b.type,
      headingLevel: b.heading_level,
      text: b.text,
    }));

    allBlocks = allBlocks.concat(mapped);

    if (rawBlocks.length < pageSize) {
      break;
    }
    page++;
  }

  // 3. Fetch block comment counts from view
  const { data: countsData } = await supabase
    .from("block_comment_counts")
    .select("block_id, comment_count")
    .eq("document_id", id);

  const commentCountsMap: Record<string, number> = {};
  if (countsData) {
    for (const c of countsData) {
      commentCountsMap[c.block_id] = c.comment_count;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docProfiles = (doc as any).profiles;
  const ownerDisplayName = docProfiles?.display_name || "Unknown Author";
  const ownerUserType = docProfiles?.user_type || "student";

  return (
    <Reader
      document={doc}
      ownerDisplayName={ownerDisplayName}
      ownerUserType={ownerUserType}
      blocks={allBlocks}
      initialCommentCounts={commentCountsMap}
      currentUserId={user ? user.id : null}
    />
  );
}
