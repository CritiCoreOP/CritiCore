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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          media_id: string | null
          media_poster: string | null
          media_type: string | null
          metadata: Json | null
          target_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          media_id?: string | null
          media_poster?: string | null
          media_type?: string | null
          metadata?: Json | null
          target_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          media_id?: string | null
          media_poster?: string | null
          media_type?: string | null
          metadata?: Json | null
          target_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      api_applications: {
        Row: {
          agree_terms: boolean
          created_at: string
          expected_requests: string
          id: string
          project_name: string
          project_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          use_case: string
          user_id: string
        }
        Insert: {
          agree_terms?: boolean
          created_at?: string
          expected_requests: string
          id?: string
          project_name: string
          project_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          use_case: string
          user_id: string
        }
        Update: {
          agree_terms?: boolean
          created_at?: string
          expected_requests?: string
          id?: string
          project_name?: string
          project_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          use_case?: string
          user_id?: string
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          response_data: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          response_data: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          response_data?: Json
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          active: boolean
          api_version: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_request_at: string | null
          last_reset_at: string
          name: string
          rate_limit: number
          requests_today: number
          requests_total: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          api_version?: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_request_at?: string | null
          last_reset_at?: string
          name?: string
          rate_limit?: number
          requests_today?: number
          requests_total?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          api_version?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_request_at?: string | null
          last_reset_at?: string
          name?: string
          rate_limit?: number
          requests_today?: number
          requests_total?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_status_events: {
        Row: {
          created_at: string
          detail: string | null
          ended_at: string | null
          id: string
          latency_ms: number | null
          service_id: string
          service_name: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          ended_at?: string | null
          id?: string
          latency_ms?: number | null
          service_id: string
          service_name: string
          started_at?: string
          status: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          ended_at?: string | null
          id?: string
          latency_ms?: number | null
          service_id?: string
          service_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      article_briefings: {
        Row: {
          article_id: string
          author_id: string
          body: string
          created_at: string
          deadline: string | null
          id: string
          links: Json
          updated_at: string
        }
        Insert: {
          article_id: string
          author_id: string
          body?: string
          created_at?: string
          deadline?: string | null
          id?: string
          links?: Json
          updated_at?: string
        }
        Update: {
          article_id?: string
          author_id?: string
          body?: string
          created_at?: string
          deadline?: string | null
          id?: string
          links?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_briefings_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_collaborators: {
        Row: {
          accepted: boolean
          article_id: string
          created_at: string
          id: string
          invite_token: string | null
          invited_by: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted?: boolean
          article_id: string
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_by: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          article_id?: string
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_by?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_collaborators_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_comments: {
        Row: {
          anchor_id: string
          article_id: string
          author_id: string
          body: string
          created_at: string
          id: string
          quoted_text: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          anchor_id: string
          article_id: string
          author_id: string
          body?: string
          created_at?: string
          id?: string
          quoted_text?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          anchor_id?: string
          article_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          quoted_text?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_live_updates: {
        Row: {
          article_id: string
          author_id: string | null
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_key: boolean
          is_pinned: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          article_id: string
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_key?: boolean
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          article_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_key?: boolean
          is_pinned?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_live_updates_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_media_links: {
        Row: {
          added_by: string
          article_id: string
          created_at: string
          id: string
          media_id: string
          media_poster: string | null
          media_title: string
          media_type: string
        }
        Insert: {
          added_by: string
          article_id: string
          created_at?: string
          id?: string
          media_id: string
          media_poster?: string | null
          media_title: string
          media_type: string
        }
        Update: {
          added_by?: string
          article_id?: string
          created_at?: string
          id?: string
          media_id?: string
          media_poster?: string | null
          media_title?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_media_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_reactions: {
        Row: {
          article_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reactions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_translations: {
        Row: {
          article_id: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          target_lang: string
          title: string
          updated_at: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          target_lang: string
          title: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          target_lang?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_type: string
          category: string | null
          content: string
          corrected_at: string | null
          correction_note: string | null
          cover_image_url: string | null
          cover_image_credit: string | null
          cover_image_credit_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          language: string
          live_status: string | null
          published: boolean
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["article_status"]
          tgn_plus: boolean
          title: string
          translation_group: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          article_type: string
          category?: string | null
          content: string
          corrected_at?: string | null
          correction_note?: string | null
          cover_image_url?: string | null
          cover_image_credit?: string | null
          cover_image_credit_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          language?: string
          live_status?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["article_status"]
          tgn_plus?: boolean
          title: string
          translation_group?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          article_type?: string
          category?: string | null
          content?: string
          corrected_at?: string | null
          correction_note?: string | null
          cover_image_url?: string | null
          cover_image_credit?: string | null
          cover_image_credit_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          language?: string
          live_status?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["article_status"]
          tgn_plus?: boolean
          title?: string
          translation_group?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          condition_type: string
          condition_value: number | null
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category?: string
          condition_type?: string
          condition_value?: number | null
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          condition_type?: string
          condition_value?: number | null
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      banned_ips: {
        Row: {
          active: boolean
          banned_by: string
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
          related_user_id: string | null
        }
        Insert: {
          active?: boolean
          banned_by: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
          related_user_id?: string | null
        }
        Update: {
          active?: boolean
          banned_by?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
          related_user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_versions: {
        Row: {
          category_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_name: string
          previous_name: string
        }
        Insert: {
          category_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_name: string
          previous_name: string
        }
        Update: {
          category_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_name?: string
          previous_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_versions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_list_items: {
        Row: {
          added_at: string
          id: string
          list_id: string
          media_id: string
          media_poster: string | null
          media_title: string
          media_type: string
          sort_order: number
        }
        Insert: {
          added_at?: string
          id?: string
          list_id: string
          media_id: string
          media_poster?: string | null
          media_title: string
          media_type: string
          sort_order?: number
        }
        Update: {
          added_at?: string
          id?: string
          list_id?: string
          media_id?: string
          media_poster?: string | null
          media_title?: string
          media_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_lists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dmca_requests: {
        Row: {
          content_url: string
          created_at: string
          description: string
          email: string
          full_name: string
          id: string
          original_work_url: string | null
          status: string
          sworn_statement: boolean
          updated_at: string
        }
        Insert: {
          content_url: string
          created_at?: string
          description: string
          email: string
          full_name: string
          id?: string
          original_work_url?: string | null
          status?: string
          sworn_statement?: boolean
          updated_at?: string
        }
        Update: {
          content_url?: string
          created_at?: string
          description?: string
          email?: string
          full_name?: string
          id?: string
          original_work_url?: string | null
          status?: string
          sworn_statement?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          used?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_image: string | null
          target_name: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_image?: string | null
          target_name: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_image?: string | null
          target_name?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          content: string
          created_at: string
          downvotes: number
          edited_at: string | null
          id: string
          is_edited: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_communities: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_official: boolean
          member_count: number
          name: string
          post_count: number
          slug: string
          status_emoji: string | null
          status_icon_url: string | null
          status_text: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_official?: boolean
          member_count?: number
          name: string
          post_count?: number
          slug: string
          status_emoji?: string | null
          status_icon_url?: string | null
          status_text?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_official?: boolean
          member_count?: number
          name?: string
          post_count?: number
          slug?: string
          status_emoji?: string | null
          status_icon_url?: string | null
          status_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      forum_community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_community_widgets: {
        Row: {
          community_id: string
          content: Json
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          community_id: string
          content?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          widget_type: string
        }
        Update: {
          community_id?: string
          content?: Json
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_community_widgets_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_flairs: {
        Row: {
          bg_color: string
          color: string
          community_id: string
          created_at: string
          created_by: string
          emoji: string | null
          flair_type: string
          icon_url: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bg_color?: string
          color?: string
          community_id: string
          created_at?: string
          created_by: string
          emoji?: string | null
          flair_type?: string
          icon_url?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bg_color?: string
          color?: string
          community_id?: string
          created_at?: string
          created_by?: string
          emoji?: string | null
          flair_type?: string
          icon_url?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_flairs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_mod_mail: {
        Row: {
          community_id: string
          content: string
          created_at: string
          id: string
          is_mod_reply: boolean
          parent_id: string | null
          sender_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_mod_reply?: boolean
          parent_id?: string | null
          sender_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_mod_reply?: boolean
          parent_id?: string | null
          sender_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_mod_mail_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_mod_mail_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_mod_mail"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string | null
          comment_count: number
          community_id: string | null
          content: string
          created_at: string
          downvotes: number
          edited_at: string | null
          flair_id: string | null
          id: string
          image_url: string | null
          is_edited: boolean
          pinned: boolean
          title: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          category?: string | null
          comment_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          flair_id?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          pinned?: boolean
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          category?: string | null
          comment_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          flair_id?: string | null
          id?: string
          image_url?: string | null
          is_edited?: boolean
          pinned?: boolean
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_flair_id_fkey"
            columns: ["flair_id"]
            isOneToOne: false
            referencedRelation: "forum_flairs"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_user_flair_assignments: {
        Row: {
          community_id: string
          created_at: string
          flair_id: string
          id: string
          status_icon_url: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          flair_id: string
          id?: string
          status_icon_url?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          flair_id?: string
          id?: string
          status_icon_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_user_flair_assignments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "forum_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_user_flair_assignments_flair_id_fkey"
            columns: ["flair_id"]
            isOneToOne: false
            referencedRelation: "forum_flairs"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          apply_email: string | null
          apply_url: string | null
          created_at: string
          description: string
          employment_type: string
          id: string
          location: string | null
          offer: string
          profile: string
          published: boolean
          published_at: string | null
          slug: string
          sort_order: number
          summary: string | null
          tasks: string
          team: string | null
          title: string
          updated_at: string
          valid_through: string | null
          workplace: string
        }
        Insert: {
          apply_email?: string | null
          apply_url?: string | null
          created_at?: string
          description?: string
          employment_type?: string
          id?: string
          location?: string | null
          offer?: string
          profile?: string
          published?: boolean
          published_at?: string | null
          slug: string
          sort_order?: number
          summary?: string | null
          tasks?: string
          team?: string | null
          title: string
          updated_at?: string
          valid_through?: string | null
          workplace?: string
        }
        Update: {
          apply_email?: string | null
          apply_url?: string | null
          created_at?: string
          description?: string
          employment_type?: string
          id?: string
          location?: string | null
          offer?: string
          profile?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          sort_order?: number
          summary?: string | null
          tasks?: string
          team?: string | null
          title?: string
          updated_at?: string
          valid_through?: string | null
          workplace?: string
        }
        Relationships: []
      }
      media_categories: {
        Row: {
          assigned_by: string | null
          category_id: string
          created_at: string
          id: string
          media_id: string
          media_type: string
        }
        Insert: {
          assigned_by?: string | null
          category_id: string
          created_at?: string
          id?: string
          media_id: string
          media_type: string
        }
        Update: {
          assigned_by?: string | null
          category_id?: string
          created_at?: string
          id?: string
          media_id?: string
          media_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      media_enrichment: {
        Row: {
          categories: string[]
          created_at: string
          description_de: string | null
          id: string
          media_type: string
          source_id: string
          tags: string[]
        }
        Insert: {
          categories?: string[]
          created_at?: string
          description_de?: string | null
          id?: string
          media_type: string
          source_id: string
          tags?: string[]
        }
        Update: {
          categories?: string[]
          created_at?: string
          description_de?: string | null
          id?: string
          media_type?: string
          source_id?: string
          tags?: string[]
        }
        Relationships: []
      }
      media_images: {
        Row: {
          created_at: string
          id: string
          image_type: string
          media_id: string
          media_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_type: string
          media_id: string
          media_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          image_type?: string
          media_id?: string
          media_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      media_metadata: {
        Row: {
          created_at: string
          id: string
          media_id: string
          media_type: string
          meta_key: string
          meta_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          media_type: string
          meta_key: string
          meta_value: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          media_type?: string
          meta_key?: string
          meta_value?: string
        }
        Relationships: []
      }
      media_releases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          media_id: string
          media_type: string
          notes: string | null
          region: string
          release_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          media_id: string
          media_type: string
          notes?: string | null
          region?: string
          release_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          media_id?: string
          media_type?: string
          notes?: string | null
          region?: string
          release_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_status: {
        Row: {
          created_at: string
          id: string
          media_id: string
          media_poster: string | null
          media_title: string
          media_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          media_poster?: string | null
          media_title: string
          media_type: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          media_poster?: string | null
          media_title?: string
          media_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      media_tags: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          media_id: string
          media_type: string
          tag_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          media_id: string
          media_type: string
          tag_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          media_id?: string
          media_type?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string | null
          confirmed: boolean
          created_at: string
          email: string
          id: string
          subscribed: boolean
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          confirm_token?: string | null
          confirmed?: boolean
          created_at?: string
          email: string
          id?: string
          subscribed?: boolean
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirm_token?: string | null
          confirmed?: boolean
          created_at?: string
          email?: string
          id?: string
          subscribed?: boolean
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          read: boolean
          target_id: string
          target_type: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          target_id: string
          target_type: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          target_id?: string
          target_type?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_anonymous: boolean
          closes_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          multiple_choice: boolean
          status: string
          text_prompt: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          multiple_choice?: boolean
          status?: string
          text_prompt?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_anonymous?: boolean
          closes_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          multiple_choice?: boolean
          status?: string
          text_prompt?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      press_profiles: {
        Row: {
          created_at: string
          id: string
          organization: string | null
          press_logo: string | null
          trusted: boolean
          user_id: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization?: string | null
          press_logo?: string | null
          trusted?: boolean
          user_id: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization?: string | null
          press_logo?: string | null
          trusted?: boolean
          user_id?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anime_title_language: string
          avatar_url: string | null
          ban_reason: string | null
          bio: string | null
          comment_karma: number
          created_at: string
          display_name: string | null
          display_name_changed_at: string | null
          forum_onboarded_at: string | null
          id: string
          is_official: boolean
          onboarding_completed_at: string | null
          post_karma: number
          staff_roles: string[]
          status: string
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          anime_title_language?: string
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          comment_karma?: number
          created_at?: string
          display_name?: string | null
          display_name_changed_at?: string | null
          forum_onboarded_at?: string | null
          id?: string
          is_official?: boolean
          onboarding_completed_at?: string | null
          post_karma?: number
          staff_roles?: string[]
          status?: string
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          anime_title_language?: string
          avatar_url?: string | null
          ban_reason?: string | null
          bio?: string | null
          comment_karma?: number
          created_at?: string
          display_name?: string | null
          display_name_changed_at?: string | null
          forum_onboarded_at?: string | null
          id?: string
          is_official?: boolean
          onboarding_completed_at?: string | null
          post_karma?: number
          staff_roles?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: []
      }
      release_subscriptions: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          lang: string
          media_id: string
          media_type: string
          notified_at: string | null
          notify_on: string[]
          path: string | null
          release_date: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          lang?: string
          media_id: string
          media_type: string
          notified_at?: string | null
          notify_on?: string[]
          path?: string | null
          release_date?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          lang?: string
          media_id?: string
          media_type?: string
          notified_at?: string | null
          notify_on?: string[]
          path?: string | null
          release_date?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      review_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          created_at: string
          episode_number: number | null
          id: string
          is_critic_review: boolean
          media_id: string
          media_type: string
          score: number
          season_number: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          episode_number?: number | null
          id?: string
          is_critic_review?: boolean
          media_id: string
          media_type: string
          score: number
          season_number?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          episode_number?: number | null
          id?: string
          is_critic_review?: boolean
          media_id?: string
          media_type?: string
          score?: number
          season_number?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          created_at: string
          desc_key: string
          id: string
          old_quarter: string | null
          quarter: string | null
          sort_order: number
          status: string
          title_key: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          desc_key: string
          id?: string
          old_quarter?: string | null
          quarter?: string | null
          sort_order?: number
          status?: string
          title_key: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          desc_key?: string
          id?: string
          old_quarter?: string | null
          quarter?: string | null
          sort_order?: number
          status?: string
          title_key?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      rw_invites: {
        Row: {
          accepted: boolean
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "rw_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_meetings: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          id: string
          meeting_date: string
          meeting_time: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_date: string
          meeting_time: string
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_date?: string
          meeting_time?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rw_meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "rw_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "rw_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_pages: {
        Row: {
          content: Json | null
          cover_url: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_public: boolean
          parent_id: string | null
          sort_order: number
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_public?: boolean
          parent_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_public?: boolean
          parent_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rw_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "rw_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rw_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "rw_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rw_workspaces: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_watchlist_items: {
        Row: {
          added_at: string
          added_by: string
          id: string
          media_id: string
          media_poster: string | null
          media_title: string
          media_type: string
          sort_order: number
          watchlist_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          id?: string
          media_id: string
          media_poster?: string | null
          media_title: string
          media_type: string
          sort_order?: number
          watchlist_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          id?: string
          media_id?: string
          media_poster?: string | null
          media_title?: string
          media_type?: string
          sort_order?: number
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "shared_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_watchlist_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          user_id: string
          watchlist_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          watchlist_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_watchlist_members_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "shared_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_watchlists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_assets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          name: string
          path: string
          size_bytes: number | null
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          name: string
          path: string
          size_bytes?: number | null
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          path?: string
          size_bytes?: number | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      social_shares: {
        Row: {
          article_id: string
          id: string
          platform: string
          post_url: string | null
          shared_at: string
          shared_by: string | null
        }
        Insert: {
          article_id: string
          id?: string
          platform: string
          post_url?: string | null
          shared_at?: string
          shared_by?: string | null
        }
        Update: {
          article_id?: string
          id?: string
          platform?: string
          post_url?: string | null
          shared_at?: string
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_shares_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          reviewed_by: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          reviewed_by?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          reviewed_by?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          seen: boolean
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          seen?: boolean
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          seen?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_saves: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          category: string
          created_at: string
          id: string
          issued_by: string
          message: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          category: string
          created_at?: string
          id?: string
          issued_by: string
          message?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          category?: string
          created_at?: string
          id?: string
          issued_by?: string
          message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_watchlist: {
        Row: {
          created_at: string
          id: string
          list_type: string
          media_id: string
          media_type: string
          notes: string | null
          priority: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_type?: string
          media_id: string
          media_type: string
          notes?: string | null
          priority?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_type?: string
          media_id?: string
          media_type?: string
          notes?: string | null
          priority?: number | null
          user_id?: string
        }
        Relationships: []
      }
      username_history: {
        Row: {
          changed_at: string
          id: string
          old_username: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          old_username: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          old_username?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_article_invite: { Args: { p_token: string }; Returns: Json }
      accept_rw_invite: { Args: { p_token: string }; Returns: Json }
      admin_list_ban_reasons: {
        Args: never
        Returns: {
          ban_reason: string
          user_id: string
        }[]
      }
      can_press_publish: { Args: { _user_id: string }; Returns: boolean }
      can_view_article: { Args: { _article_id: string }; Returns: boolean }
      claim_badges: {
        Args: never
        Returns: {
          badge_id: string
          slug: string
        }[]
      }
      cleanup_expired_cache: { Args: never; Returns: undefined }
      create_rw_invite: {
        Args: { p_email?: string; p_role: string; p_workspace_id: string }
        Returns: Json
      }
      create_rw_workspace: { Args: { p_name: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      explore_media_feed: {
        Args: { p_limit?: number; p_media_type?: string; p_offset?: number }
        Returns: {
          created_at: string
          media_id: string
          media_type: string
          poster_path: string
          release_date: string
          score: number
          title: string
        }[]
      }
      forum_vote: {
        Args: {
          p_target_id: string
          p_target_type: string
          p_user_id: string
          p_vote_type: string
        }
        Returns: Json
      }
      get_own_ban_info: {
        Args: never
        Returns: {
          ban_reason: string
          status: string
        }[]
      }
      get_poll_reasons: {
        Args: { p_poll_id: string }
        Returns: {
          reason: string
        }[]
      }
      get_poll_vote_counts: {
        Args: { p_poll_id: string }
        Returns: {
          count: number
          option_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_article_collaborator: {
        Args: { _article_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend: {
        Args: { _friend_id: string; _user_id: string }
        Returns: boolean
      }
      is_rw_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_rw_role: {
        Args: { _role: string; _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_shared_watchlist_member: {
        Args: { _user_id: string; _watchlist_id: string }
        Returns: boolean
      }
      lookup_ticket_status: {
        Args: { ticket_id: string }
        Returns: {
          category: string
          created_at: string
          id: string
          status: string
          subject: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_karma: { Args: { p_user_id: string }; Returns: undefined }
      safe_ban_reason: {
        Args: { profile_user_id: string; raw_ban_reason: string }
        Returns: string
      }
      sync_anilist_media: {
        Args: { p_anilist_id: number; p_payload: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "press" | "admin"
      article_status: "idea" | "research" | "writing" | "review" | "published"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "press", "admin"],
      article_status: ["idea", "research", "writing", "review", "published"],
    },
  },
} as const
