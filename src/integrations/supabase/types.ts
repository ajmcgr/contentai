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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_logs: {
        Row: {
          correlation_id: string | null
          created_at: string | null
          detail: string | null
          id: number
          level: string | null
          provider: string | null
          stage: string
          user_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string | null
          detail?: string | null
          id?: never
          level?: string | null
          provider?: string | null
          stage: string
          user_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string | null
          detail?: string | null
          id?: never
          level?: string | null
          provider?: string | null
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string | null
          id: string
          key: string
          namespace: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          namespace: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          namespace?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          logout_version: number
          updated_at: string
        }
        Insert: {
          id?: string
          logout_version?: number
          updated_at?: string
        }
        Update: {
          id?: string
          logout_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          content: string
          created_at: string | null
          featured_image_url: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          published_at: string | null
          readability_score: number | null
          seo_score: number | null
          slug: string | null
          status: string | null
          target_keyword: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          readability_score?: number | null
          seo_score?: number | null
          slug?: string | null
          status?: string | null
          target_keyword?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          published_at?: string | null
          readability_score?: number | null
          seo_score?: number | null
          slug?: string | null
          status?: string | null
          target_keyword?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          brand_name: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          internal_links: string[] | null
          language: string | null
          logo_url: string | null
          tags: string[] | null
          target_audience: string | null
          tone_of_voice: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          internal_links?: string[] | null
          language?: string | null
          logo_url?: string | null
          tags?: string[] | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          internal_links?: string[] | null
          language?: string | null
          logo_url?: string | null
          tags?: string[] | null
          target_audience?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      cms_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          config: Json | null
          connected_at: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          platform: string
          refresh_token: string | null
          site_url: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          config?: Json | null
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          platform: string
          refresh_token?: string | null
          site_url: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          config?: Json | null
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          platform?: string
          refresh_token?: string | null
          site_url?: string
          user_id?: string
        }
        Relationships: []
      }
      cms_installs: {
        Row: {
          access_token: string
          created_at: string | null
          external_id: string
          extra: Json | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          external_id: string
          extra?: Json | null
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          external_id?: string
          extra?: Json | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          email_from: string | null
          id: string
          resend_api_key: string | null
          updated_at: string
        }
        Insert: {
          email_from?: string | null
          id: string
          resend_api_key?: string | null
          updated_at?: string
        }
        Update: {
          email_from?: string | null
          id?: string
          resend_api_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      config_integrations: {
        Row: {
          id: string
          updated_at: string | null
          updated_by_user_id: string | null
          wp_client_id: string | null
          wp_client_secret: string | null
          wp_redirect_uri: string | null
        }
        Insert: {
          id?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          wp_client_id?: string | null
          wp_client_secret?: string | null
          wp_redirect_uri?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
          wp_client_id?: string | null
          wp_client_secret?: string | null
          wp_redirect_uri?: string | null
        }
        Relationships: []
      }
      content_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          structure: Json
          template_type: string
          updated_at: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          structure: Json
          template_type: string
          updated_at?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          structure?: Json
          template_type?: string
          updated_at?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          output_data: Json | null
          progress: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data: Json
          job_type: string
          output_data?: Json | null
          progress?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          output_data?: Json | null
          progress?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_usage: {
        Row: {
          articles_created: number
          created_at: string
          id: string
          max_articles: number
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          articles_created?: number
          created_at?: string
          id?: string
          max_articles?: number
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          articles_created?: number
          created_at?: string
          id?: string
          max_articles?: number
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          expires_at: string
          state: string
          user_id: string
        }
        Update: {
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email_verification_expires_at: string | null
          email_verification_token: string | null
          email_verified_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          email_verification_expires_at?: string | null
          email_verification_token?: string | null
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          updated_at?: string
          user_id?: string
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
      user_trials: {
        Row: {
          articles_created: number
          created_at: string
          has_upgraded: boolean
          id: string
          is_trial_active: boolean
          max_trial_articles: number
          trial_end_date: string
          trial_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          articles_created?: number
          created_at?: string
          has_upgraded?: boolean
          id?: string
          is_trial_active?: boolean
          max_trial_articles?: number
          trial_end_date?: string
          trial_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          articles_created?: number
          created_at?: string
          has_upgraded?: boolean
          id?: string
          is_trial_active?: boolean
          max_trial_articles?: number
          trial_end_date?: string
          trial_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wix_connections: {
        Row: {
          access_token: string
          created_at: string
          default_member_id: string | null
          expires_at: string | null
          id: string
          instance_id: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string
          wix_author_member_id: string | null
          wix_host: string | null
          wix_site_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          default_member_id?: string | null
          expires_at?: string | null
          id?: string
          instance_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
          wix_author_member_id?: string | null
          wix_host?: string | null
          wix_site_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          default_member_id?: string | null
          expires_at?: string | null
          id?: string
          instance_id?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
          wix_author_member_id?: string | null
          wix_host?: string | null
          wix_site_id?: string | null
        }
        Relationships: []
      }
      wp_tokens: {
        Row: {
          access_token: string
          blog_id: string | null
          blog_url: string | null
          created_at: string | null
          id: string
          scope: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          blog_id?: string | null
          blog_url?: string | null
          created_at?: string | null
          id?: string
          scope?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          blog_id?: string | null
          blog_url?: string | null
          created_at?: string | null
          id?: string
          scope?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_article: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      cleanup_expired_oauth_states: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_shopify_install_debug: {
        Args: { shop_domain: string; user_uuid: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_monthly_usage: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      increment_trial_articles: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_trial_active: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      trigger_daily_generation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
