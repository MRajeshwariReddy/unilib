export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserType = "student" | "professor" | "author" | "publisher";

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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
