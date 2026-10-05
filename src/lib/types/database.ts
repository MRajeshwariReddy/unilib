export interface Profile {
  id: string;
  display_name: string;
  user_type: "student" | "professor" | "author" | "publisher";
  created_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  license:
    | "all_rights_reserved"
    | "public_domain"
    | "cc_by"
    | "cc_by_sa"
    | "cc_by_nc"
    | "cc_by_nd"
    | "cc_by_nc_sa"
    | "cc_by_nc_nd";
  rights_attested: boolean;
  source_format: "docx" | "md" | "txt";
  original_filename: string;
  file_size_bytes: number;
  storage_path: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  error_code: string | null;
  error_message: string | null;
  block_count: number;
  char_count: number;
  parser_version: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Block {
  id: string;
  document_id: string;
  position: number;
  type: "heading" | "paragraph" | "list_item" | "quote" | "code" | "table_row";
  heading_level: number | null;
  text: string;
  created_at: string;
}

export interface Comment {
  id: string;
  document_id: string;
  block_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AIRequest {
  id: string;
  user_id: string;
  document_id: string | null;
  created_at: string;
  preset: "summarize" | null;
  question: string | null;
  focus_block_id: string | null;
  retrieval_mode: "full" | "fts" | null;
  context_block_count: number | null;
  status: "pending" | "answered" | "refused" | "error";
  refusal_reason: "not_in_document" | "off_topic" | "no_context" | null;
  error_code: string | null;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  citations_returned: number | null;
  segments_dropped: number | null;
  response: Record<string, unknown> | null;
}
