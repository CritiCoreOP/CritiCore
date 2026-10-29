// Posts an article to the CritiCore Bluesky account straight from the post generator.
// POST { articleId, text } → { postUrl }
//   text is the post as edited in the generator (at most 300 graphemes). The link card with
//   title, teaser and cover is built here from the published article, not from the request.
// Admins and press only. Each article goes out once; a second try returns 409 with the post.
// Secrets: BLUESKY_HANDLE (e.g. criticore.cc), BLUESKY_APP_PASSWORD (Settings → App passwords),
// optional BLUESKY_SERVICE (default https://bsky.social).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BLUESKY_LIMIT, BlueskyError, createBlueskyPost, graphemes } from '../_shared/bluesky.ts'
import { SITE_URL } from '../_shared/email-templates/email-assets.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALES: Record<string, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', th: 'th-TH' }
const NEWS_SEGMENT: Record<string, string> = { fr: 'actualites', es: 'noticias' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Unauthorized' }, 401)
  const [{ data: isAdmin }, { data: isPress }] = await Promise.all([
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    supabase.rpc('has_role', { _user_id: user.id, _role: 'press' }),
  ])
  if (!isAdmin && !isPress) return json({ error: 'Forbidden' }, 403)

  const handle = Deno.env.get('BLUESKY_HANDLE')
  const appPassword = Deno.env.get('BLUESKY_APP_PASSWORD')
  if (!handle || !appPassword) return json({ error: 'not_configured' }, 503)

  let body: { articleId?: unknown; text?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const articleId = typeof body.articleId === 'string' && UUID.test(body.articleId) ? body.articleId : null
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!articleId || !text) return json({ error: 'articleId and text are required' }, 400)
  if (graphemes(text) > BLUESKY_LIMIT) return json({ error: 'too_long' }, 400)

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, excerpt, slug, cover_image_url, language, published')
    .eq('id', articleId)
    .maybeSingle()
  if (!article?.published) return json({ error: 'Article not found' }, 404)

  const { data: existing } = await supabase
    .from('social_shares')
    .select('post_url')
    .eq('article_id', articleId)
    .eq('platform', 'bluesky')
    .maybeSingle()
  if (existing?.post_url) return json({ error: 'already_posted', postUrl: existing.post_url }, 409)

  const lang = LOCALES[article.language ?? ''] ? article.language! : 'de'
  const articleUrl = `${SITE_URL}/${LOCALES[lang]}/${NEWS_SEGMENT[lang] ?? 'news'}/${encodeURIComponent(article.slug)}`
  // Covers on our storage come scaled down, so they fit Bluesky's 1 MB picture limit
  const storage = `${SUPABASE_URL}/storage/v1/object/public/`
  const cover = article.cover_image_url?.startsWith(storage)
    ? `${SUPABASE_URL}/storage/v1/render/image/public/${article.cover_image_url.slice(storage.length)}?width=1200&quality=75`
    : article.cover_image_url

  let post: { uri: string; url: string }
  try {
    post = await createBlueskyPost({
      service: Deno.env.get('BLUESKY_SERVICE') || undefined,
      identifier: handle,
      appPassword,
      text,
      lang,
      card: { uri: articleUrl, title: article.title, description: article.excerpt ?? '', imageUrl: cover },
    })
  } catch (e) {
    const status = e instanceof BlueskyError ? e.status : 500
    console.error('bluesky-post failed', status, e instanceof Error ? e.message : String(e))
    return json({ error: status === 401 ? 'bluesky_login_failed' : 'bluesky_error' }, 502)
  }

  const { error: markError } = await supabase
    .from('social_shares')
    .upsert({ article_id: articleId, platform: 'bluesky', shared_by: user.id, shared_at: new Date().toISOString(), post_url: post.url }, { onConflict: 'article_id,platform' })
  if (markError) console.error('bluesky-post: marking as shared failed', markError.message)

  return json({ postUrl: post.url })
})
