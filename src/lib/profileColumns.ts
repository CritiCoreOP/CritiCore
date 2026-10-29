/**
 * Selectable columns on `profiles` for the Data API.
 *
 * `ban_reason` is intentionally excluded: the column is not readable by
 * anon/authenticated roles (column-level privileges). Admins read ban reasons
 * through the `admin_list_ban_reasons` RPC, users through `get_own_ban_info`.
 */
export const PROFILE_COLUMNS =
  "id, user_id, display_name, avatar_url, bio, status, created_at, updated_at, is_official, username, username_changed_at, display_name_changed_at, onboarding_completed_at, post_karma, comment_karma, forum_onboarded_at, anime_title_language";
