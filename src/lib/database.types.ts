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
          user_id: string
          name: string
          email: string
          avatar_url: string | null
          points_balance: number
          points_earned: number
          points_spent: number
          points_purchased: number
          trust_score: number
          tasks_completed: number
          tasks_submitted: number
          is_premium: boolean
          is_banned: boolean
          ban_reason: string | null
          referral_code: string
          referred_by: string | null
          wallet_balance: number
          withdrawable_balance: number
          ip_address: string | null
          device_fingerprint: string | null
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          avatar_url?: string | null
          points_balance?: number
          points_earned?: number
          points_spent?: number
          points_purchased?: number
          trust_score?: number
          tasks_completed?: number
          tasks_submitted?: number
          is_premium?: boolean
          is_banned?: boolean
          ban_reason?: string | null
          referral_code?: string
          referred_by?: string | null
          wallet_balance?: number
          withdrawable_balance?: number
          ip_address?: string | null
          device_fingerprint?: string | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          owner_id: string
          platform: 'instagram' | 'facebook' | 'youtube'
          task_type: 'like' | 'comment' | 'subscribe'
          post_url: string
          title: string | null
          reward_points: number
          total_actions: number
          completed_actions: number
          status: 'active' | 'paused' | 'completed' | 'expired' | 'deleted'
          is_boosted: boolean
          boost_expires_at: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          platform: 'instagram' | 'facebook' | 'youtube'
          task_type: 'like' | 'comment' | 'subscribe'
          post_url: string
          title?: string | null
          reward_points: number
          total_actions: number
          completed_actions?: number
          status?: 'active' | 'paused' | 'completed' | 'expired' | 'deleted'
          is_boosted?: boolean
          boost_expires_at?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      task_completions: {
        Row: {
          id: string
          task_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected' | 'disputed'
          comment_text: string | null
          screenshot_url: string | null
          started_at: string
          completed_at: string | null
          approved_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          points_awarded: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected' | 'disputed'
          comment_text?: string | null
          screenshot_url?: string | null
          started_at?: string
          completed_at?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          points_awarded?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['task_completions']['Insert']>
      }
      wallet_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus' | 'referral'
          points: number
          balance_after: number
          description: string | null
          reference_id: string | null
          reference_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus' | 'referral'
          points: number
          balance_after: number
          description?: string | null
          reference_id?: string | null
          reference_type?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['wallet_transactions']['Insert']>
      }
      payments: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          points: number
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          gateway: string
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          package_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          points: number
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          gateway: string
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          package_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          signup_bonus_paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          signup_bonus_paid?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>
      }
      referral_commissions: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          payment_id: string | null
          amount: number
          commission_rate: number
          status: string
          locked_until: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          payment_id?: string | null
          amount: number
          commission_rate?: number
          status?: string
          locked_until?: string
          paid_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['referral_commissions']['Insert']>
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          task_id: string | null
          completion_id: string | null
          reason: string
          description: string | null
          status: string
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          task_id?: string | null
          completion_id?: string | null
          reason: string
          description?: string | null
          status?: string
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
      payout_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          account_details: Json
          status: string
          processed_by: string | null
          processed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          method: string
          account_details: Json
          status?: string
          processed_by?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payout_requests']['Insert']>
      }
      point_economy: {
        Row: {
          id: string
          platform: 'instagram' | 'facebook' | 'youtube'
          task_type: 'like' | 'comment' | 'subscribe'
          earn_points: number
          cost_points: number
          estimated_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform: 'instagram' | 'facebook' | 'youtube'
          task_type: 'like' | 'comment' | 'subscribe'
          earn_points: number
          cost_points: number
          estimated_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['point_economy']['Insert']>
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'moderator' | 'user'
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'moderator' | 'user'
        }
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>
      }
    }
    Views: {}
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: 'admin' | 'moderator' | 'user'
      platform_type: 'instagram' | 'facebook' | 'youtube'
      task_type: 'like' | 'comment' | 'subscribe'
      transaction_type: 'earned' | 'spent' | 'purchased' | 'refunded' | 'bonus' | 'referral'
      task_status: 'active' | 'paused' | 'completed' | 'expired' | 'deleted'
      completion_status: 'pending' | 'approved' | 'rejected' | 'disputed'
      payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
    }
    CompositeTypes: {}
  }
}
