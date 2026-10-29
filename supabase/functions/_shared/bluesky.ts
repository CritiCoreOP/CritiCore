// Posting to Bluesky through the AT Protocol, with an app password of the CritiCore account.
// Plain fetch and no Deno APIs, so the helpers also run in the vitest suite.

export const BLUESKY_LIMIT = 300

export interface Facet {
  index: { byteStart: number; byteEnd: number }
  features: Array<{ $type: 'app.bsky.richtext.facet#link'; uri: string } | { $type: 'app.bsky.richtext.facet#tag'; tag: string }>
}

const bytes = (s: string) => new TextEncoder().encode(s).length

/** Bluesky counts graphemes, not UTF-16 units: an emoji or a Thai vowel sign is one */
export function graphemes(text: string): number {
  const Segmenter = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<unknown> } }).Segmenter
  if (!Segmenter) return [...text].length
  let n = 0
  for (const _ of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) n++
  return n
}

/**
 * Links and hashtags in a post are plain text until they get a facet with their UTF-8 byte range;
 * without one Bluesky shows the URL but it cannot be clicked.
 */
export function buildFacets(text: string): Facet[] {
  const facets: Facet[] = []
  for (const m of text.matchAll(/https?:\/\/[^\s<>"]+/g)) {
    const uri = m[0].replace(/[.,;:!?)\]}"'»]+$/, '')
    const start = bytes(text.slice(0, m.index))
    facets.push({ index: { byteStart: start, byteEnd: start + bytes(uri) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri }] })
  }
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{M}\p{N}_]*\p{L}[\p{L}\p{M}\p{N}_]*)/gu)) {
    const at = m.index! + m[1].length
    const start = bytes(text.slice(0, at))
    facets.push({ index: { byteStart: start, byteEnd: start + bytes(`#${m[2]}`) }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }] })
  }
  return facets.sort((a, b) => a.index.byteStart - b.index.byteStart)
}

/** "at://did:plc:…/app.bsky.feed.post/3k…" → "https://bsky.app/profile/<handle>/post/3k…" */
export function postWebUrl(atUri: string, handle: string): string {
  const rkey = atUri.split('/').pop() ?? ''
  return `https://bsky.app/profile/${handle}/post/${rkey}`
}

interface Session {
  accessJwt: string
  did: string
  handle: string
}

export interface ExternalCard {
  uri: string
  title: string
  description: string
  /** Picture for the link card; skipped when missing, too big or not loadable */
  imageUrl?: string | null
}

export class BlueskyError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function xrpc<T>(service: string, method: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${service}/xrpc/${method}`, init)
  const body = await res.text()
  if (!res.ok) {
    let message = body.slice(0, 300)
    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string }
      message = [parsed.error, parsed.message].filter(Boolean).join(': ') || message
    } catch {
      // not JSON
    }
    throw new BlueskyError(`${method}: ${message}`, res.status)
  }
  return (body ? JSON.parse(body) : {}) as T
}

/** Blobs may be at most 1 MB; bigger pictures are left out and the card shows without one */
const MAX_BLOB = 1_000_000

async function uploadThumb(service: string, session: Session, imageUrl: string) {
  const img = await fetch(imageUrl)
  if (!img.ok) return undefined
  const type = img.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return undefined
  const data = new Uint8Array(await img.arrayBuffer())
  if (data.byteLength > MAX_BLOB) return undefined
  const { blob } = await xrpc<{ blob: unknown }>(service, 'com.atproto.repo.uploadBlob', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': type },
    body: data,
  })
  return blob
}

export interface PostInput {
  service?: string
  identifier: string
  appPassword: string
  text: string
  lang?: string
  card?: ExternalCard
}

/** Logs in, uploads the card picture and creates the post. Returns the post's web address. */
export async function createBlueskyPost({ service = 'https://bsky.social', identifier, appPassword, text, lang, card }: PostInput): Promise<{ uri: string; url: string }> {
  const session = await xrpc<Session>(service, 'com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
  })

  let embed: Record<string, unknown> | undefined
  if (card) {
    const thumb = card.imageUrl ? await uploadThumb(service, session, card.imageUrl).catch(() => undefined) : undefined
    embed = {
      $type: 'app.bsky.embed.external',
      external: { uri: card.uri, title: card.title.slice(0, 300), description: card.description.slice(0, 1000), ...(thumb ? { thumb } : {}) },
    }
  }

  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    ...(lang ? { langs: [lang] } : {}),
    facets: buildFacets(text),
    ...(embed ? { embed } : {}),
  }
  const { uri } = await xrpc<{ uri: string }>(service, 'com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record }),
  })
  return { uri, url: postWebUrl(uri, session.handle) }
}
