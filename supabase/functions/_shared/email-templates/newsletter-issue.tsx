/// <reference types="npm:@types/react@18.3.1" />

// Eine Newsletter-Ausgabe im gemeinsamen Layout. Der Inhalt kommt aus dem Admin-Editor:
// Einleitung, Textabschnitte mit optionalem Button und Artikel-Abschnitte (große Karte oder
// Liste). Im Fließtext gehen **fett** und [Linktext](https://…). Der Abmeldelink ist Pflicht und
// steht sichtbar am Ende; zusätzlich setzt der Versand den List-Unsubscribe-Header.

import * as React from 'npm:react@18.3.1'
import { Column, Heading, Hr, Img, Link, Row, Section, Text } from 'npm:@react-email/components@0.0.22'

import { t, type EmailLang } from './email-i18n.ts'
import { CtaButton, EmailLayout, Paragraph, Strong } from './layout.tsx'
import { COLORS } from './email-assets.ts'

export interface NewsletterArticle {
  title: string
  excerpt: string
  url: string
  image: string | null
  category: string
}

export type NewsletterBlock =
  | { type: 'text'; heading: string; body: string; linkLabel?: string; linkUrl?: string }
  | { type: 'articles'; heading: string; layout: 'card' | 'list'; articles: NewsletterArticle[] }

interface NewsletterIssueEmailProps {
  lang: EmailLang
  subject: string
  preheader?: string
  intro?: string
  blocks: NewsletterBlock[]
  unsubscribeUrl: string
}

const safeHref = (v: string) => {
  try {
    const url = new URL(v)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

// **fett** und [Text](https://…); alles andere bleibt Text (React escaped ihn)
const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g

/** Eine Zeile Fließtext mit Fettdruck und Links */
export function inlineMarkup(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  INLINE.lastIndex = 0
  for (let m = INLINE.exec(line); m; m = INLINE.exec(line)) {
    if (m.index > last) out.push(line.slice(last, m.index))
    if (m[1]) {
      out.push(<Strong key={m.index}>{m[1]}</Strong>)
    } else {
      const href = safeHref(m[3])
      out.push(href ? <Link key={m.index} href={href} style={inlineLink}>{m[2]}</Link> : m[0])
    }
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/** Leerzeile = neuer Absatz, einzelner Umbruch = <br> */
const Paragraphs = ({ text }: { text: string }) => (
  <>
    {text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => (
        <Paragraph key={i} style={{ margin: '0 0 16px' }}>
          {p.split('\n').map((line, j, all) => (
            <React.Fragment key={j}>
              {inlineMarkup(line)}
              {j < all.length - 1 && <br />}
            </React.Fragment>
          ))}
        </Paragraph>
      ))}
  </>
)

const ArticleCard = ({ article, lang }: { article: NewsletterArticle; lang: EmailLang }) => (
  <Section style={{ margin: '0 0 24px' }}>
    {article.image && (
      <Link href={article.url}>
        <Img src={article.image} width="488" alt="" style={cardImage} />
      </Link>
    )}
    <Text style={kicker}>{article.category}</Text>
    <Link href={article.url} style={cardTitle}>{article.title}</Link>
    {article.excerpt && <Paragraph style={{ margin: '8px 0 10px' }}>{article.excerpt}</Paragraph>}
    <Link href={article.url} style={readMore}>{t('newsletterIssue.readMore', lang)} →</Link>
  </Section>
)

const ArticleRow = ({ article }: { article: NewsletterArticle }) => (
  <Row style={{ margin: '0 0 16px' }}>
    {article.image && (
      <Column style={{ width: '120px', verticalAlign: 'top', paddingRight: '14px' }}>
        <Link href={article.url}>
          <Img src={article.image} width="120" alt="" style={listImage} />
        </Link>
      </Column>
    )}
    <Column style={{ verticalAlign: 'top' }}>
      <Text style={{ ...kicker, margin: '0 0 2px' }}>{article.category}</Text>
      <Link href={article.url} style={listTitle}>{article.title}</Link>
      {article.excerpt && <Text style={listExcerpt}>{article.excerpt.length > 140 ? `${article.excerpt.slice(0, 137).trimEnd()} …` : article.excerpt}</Text>}
    </Column>
  </Row>
)

export const NewsletterIssueEmail = ({ lang, subject, preheader, intro, blocks, unsubscribeUrl }: NewsletterIssueEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={preheader?.trim() || subject}
    eyebrow={t('newsletterIssue.eyebrow', lang)}
    heading={subject}
    notice={t('newsletterIssue.notice', lang)}
  >
    {intro?.trim() && <Paragraphs text={intro} />}

    {blocks.map((b, i) => (
      <Section key={i} style={{ padding: i === 0 && !intro?.trim() ? '0' : '12px 0 0' }}>
        {i > 0 || intro?.trim() ? <Hr style={{ borderColor: COLORS.border, borderTopWidth: '1px', margin: '0 0 24px' }} /> : null}
        {b.heading.trim() && <Heading as="h2" style={h2}>{b.heading.trim()}</Heading>}
        {b.type === 'text' ? (
          <>
            {b.body.trim() && <Paragraphs text={b.body} />}
            {b.linkUrl && b.linkLabel?.trim() && <CtaButton href={b.linkUrl}>{b.linkLabel.trim()}</CtaButton>}
          </>
        ) : b.layout === 'card' ? (
          b.articles.map((a, j) => <ArticleCard key={j} article={a} lang={lang} />)
        ) : (
          b.articles.map((a, j) => <ArticleRow key={j} article={a} />)
        )}
      </Section>
    ))}

    <Hr style={{ borderColor: COLORS.border, borderTopWidth: '1px', margin: '28px 0 16px' }} />
    <Text style={{ color: COLORS.mutedForeground, fontSize: '13px', lineHeight: '20px', margin: '0' }}>
      {t('newsletterIssue.unsubscribeText', lang)}{' '}
      <Link href={unsubscribeUrl} style={{ color: COLORS.accentLight, textDecoration: 'underline' }}>
        {t('newsletterIssue.unsubscribeLink', lang)}
      </Link>
    </Text>
  </EmailLayout>
)

const displayFont = "'Glacial Indifference', 'Helvetica Neue', Helvetica, Arial, sans-serif"

const h2: React.CSSProperties = {
  color: COLORS.foreground,
  fontFamily: displayFont,
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: '1.25',
  margin: '0 0 12px',
}
const inlineLink: React.CSSProperties = { color: COLORS.accentLight, textDecoration: 'underline' }
const kicker: React.CSSProperties = {
  color: COLORS.accentLight,
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  lineHeight: '16px',
  margin: '12px 0 4px',
  textTransform: 'uppercase',
}
const cardImage: React.CSSProperties = { borderRadius: '12px', display: 'block', height: 'auto', maxWidth: '100%', width: '100%' }
const cardTitle: React.CSSProperties = {
  color: COLORS.foreground,
  display: 'block',
  fontFamily: displayFont,
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '1.3',
  textDecoration: 'none',
}
const readMore: React.CSSProperties = { color: COLORS.accentLight, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const listImage: React.CSSProperties = { borderRadius: '8px', display: 'block', height: 'auto', width: '120px' }
const listTitle: React.CSSProperties = {
  color: COLORS.foreground,
  display: 'block',
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: '22px',
  textDecoration: 'none',
}
const listExcerpt: React.CSSProperties = { color: COLORS.mutedForeground, fontSize: '14px', lineHeight: '20px', margin: '4px 0 0' }

export default NewsletterIssueEmail
