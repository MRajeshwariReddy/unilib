export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserType = "student" | "professor" | "author" | "publisher";
export type DocumentLicense =
  | "all_rights_reserved"
  | "public_domain"
  | "cc_by"
  | "cc_by_sa"
  | "cc_by_nc"
  | "cc_by_nd"
  | "cc_by_nc_sa"
  | "cc_by_nc_nd";
export type SourceFormat = "docx" | "md" | "txt";
export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";
export type BlockType =
  | "heading"
  | "paragraph"
  | "list_item"
  | "quote"
  | "code"
  | "table_row";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          user_type: UserType;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          user_type?: UserType;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          user_type?: UserType;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          subject: string | null;
          license: DocumentLicense;
          rights_attested: boolean;
          source_format: SourceFormat;
          original_filename: string;
          file_size_bytes: number;
          storage_path: string;
          status: DocumentStatus;
          error_code: string | null;
          error_message: string | null;
          block_count: number;
          char_count: number;
          parser_version: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          subject?: string | null;
          license: DocumentLicense;
          rights_attested: boolean;
          source_format: SourceFormat;
          original_filename: string;
          file_size_bytes: number;
          storage_path: string;
          status?: DocumentStatus;
          error_code?: string | null;
          error_message?: string | null;
          block_count?: number;
          char_count?: number;
          parser_version?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          subject?: string | null;
          license?: DocumentLicense;
          rights_attested?: boolean;
          source_format?: SourceFormat;
          original_filename?: string;
          file_size_bytes?: number;
          storage_path?: string;
          status?: DocumentStatus;
          error_code?: string | null;
          error_message?: string | null;
          block_count?: number;
          char_count?: number;
          parser_version?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          id: string;
          document_id: string;
          position: number;
          type: BlockType;
          heading_level: number | null;
          text: string;
          text_search: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          position: number;
          type?: BlockType;
          heading_level?: number | null;
          text: string;
          text_search?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          position?: number;
          type?: BlockType;
          heading_level?: number | null;
          text?: string;
          text_search?: unknown;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          document_id: string;
          block_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          block_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          block_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_block_document_fkey";
            columns: ["block_id", "document_id"];
            referencedRelation: "blocks";
            referencedColumns: ["id", "document_id"];
          },
        ];
      };
    };
    Views: {
      block_comment_counts: {
        Row: {
          document_id: string;
          block_id: string;
          comment_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      search_blocks: {
        Args: {
          p_document_id: string;
          p_query: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          position: number;
          rank: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export interface Profile {
  id: string;
  display_name: string;
  user_type: UserType;
  created_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  license: DocumentLicense;
  rights_attested: boolean;
  source_format: SourceFormat;
  original_filename: string;
  file_size_bytes: number;
  storage_path: string;
  status: DocumentStatus;
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
  type: BlockType;
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
