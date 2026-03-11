export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          id: string
          package_name: string | null
          points: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          package_name?: string | null
          points: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          package_name?: string | null
          points?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_details: Json
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_details: Json
          amount: number
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_details?: Json
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      point_economy: {
        Row: {
          cost_points: number
          created_at: string
          earn_points: number
          estimated_seconds: number
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          cost_points: number
          created_at?: string
          earn_points: number
          estimated_seconds?: number
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          earn_points?: number
          estimated_seconds?: number
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          id: string
          ip_address: string | null
          is_banned: boolean
          is_premium: boolean
          last_seen_at: string | null
          must_change_password: boolean
          name: string
          points_balance: number
          points_earned: number
          points_purchased: number
          points_spent: number
          referral_code: string
          referred_by: string | null
          tasks_completed: number
          tasks_submitted: number
          trust_score: number
          updated_at: string
          user_id: string
          wallet_balance: number
          withdrawable_balance: number
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          id?: string
          ip_address?: string | null
          is_banned?: boolean
          is_premium?: boolean
          last_seen_at?: string | null
          must_change_password?: boolean
          name: string
          points_balance?: number
          points_earned?: number
          points_purchased?: number
          points_spent?: number
          referral_code?: string
          referred_by?: string | null
          tasks_completed?: number
          tasks_submitted?: number
          trust_score?: number
          updated_at?: string
          user_id: string
          wallet_balance?: number
          withdrawable_balance?: number
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          is_banned?: boolean
          is_premium?: boolean
          last_seen_at?: string | null
          must_change_password?: boolean
          name?: string
          points_balance?: number
          points_earned?: number
          points_purchased?: number
          points_spent?: number
          referral_code?: string
          referred_by?: string | null
          tasks_completed?: number
          tasks_submitted?: number
          trust_score?: number
          updated_at?: string
          user_id?: string
          wallet_balance?: number
          withdrawable_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string
          id: string
          locked_until: string
          paid_at: string | null
          payment_id: string | null
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          amount: number
          commission_rate?: number
          created_at?: string
          id?: string
          locked_until?: string
          paid_at?: string | null
          payment_id?: string | null
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          locked_until?: string
          paid_at?: string | null
          payment_id?: string | null
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          first_task_completed: boolean
          first_task_reward_paid: boolean
          id: string
          referred_id: string
          referrer_id: string
          signup_bonus_paid: boolean
          signup_reward_paid: boolean
        }
        Insert: {
          created_at?: string
          first_task_completed?: boolean
          first_task_reward_paid?: boolean
          id?: string
          referred_id: string
          referrer_id: string
          signup_bonus_paid?: boolean
          signup_reward_paid?: boolean
        }
        Update: {
          created_at?: string
          first_task_completed?: boolean
          first_task_reward_paid?: boolean
          id?: string
          referred_id?: string
          referrer_id?: string
          signup_bonus_paid?: boolean
          signup_reward_paid?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          completion_id: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          task_id: string | null
        }
        Insert: {
          completion_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          task_id?: string | null
        }
        Update: {
          completion_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "task_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          approved_at: string | null
          comment_text: string | null
          completed_at: string | null
          created_at: string
          id: string
          points_awarded: number | null
          rejected_at: string | null
          rejection_reason: string | null
          screenshot_url: string | null
          started_at: string
          status: Database["public"]["Enums"]["completion_status"]
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          comment_text?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["completion_status"]
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          comment_text?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["completion_status"]
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          boost_expires_at: string | null
          completed_actions: number
          created_at: string
          expires_at: string
          id: string
          is_boosted: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          post_url: string
          reward_points: number
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string | null
          total_actions: number
          updated_at: string
        }
        Insert: {
          boost_expires_at?: string | null
          completed_actions?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_boosted?: boolean
          owner_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          post_url: string
          reward_points: number
          status?: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title?: string | null
          total_actions: number
          updated_at?: string
        }
        Update: {
          boost_expires_at?: string | null
          completed_actions?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_boosted?: boolean
          owner_id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          post_url?: string
          reward_points?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string | null
          total_actions?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          balance_after: number
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
      completion_status: "pending" | "approved" | "rejected" | "disputed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      platform_type: "instagram" | "facebook" | "youtube"
      task_status: "active" | "paused" | "completed" | "expired" | "deleted"
      task_type: "like" | "comment" | "subscribe"
      transaction_type:
        | "earned"
        | "spent"
        | "purchased"
        | "refunded"
        | "bonus"
        | "referral"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "super_admin"],
      completion_status: ["pending", "approved", "rejected", "disputed"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      platform_type: ["instagram", "facebook", "youtube"],
      task_status: ["active", "paused", "completed", "expired", "deleted"],
      task_type: ["like", "comment", "subscribe"],
      transaction_type: [
        "earned",
        "spent",
        "purchased",
        "refunded",
        "bonus",
        "referral",
      ],
    },
  },
} as const
