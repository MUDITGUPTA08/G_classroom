export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: "student" | "teacher" | "admin"
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
    }
    Enums: {
      user_role: "student" | "teacher" | "admin"
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
