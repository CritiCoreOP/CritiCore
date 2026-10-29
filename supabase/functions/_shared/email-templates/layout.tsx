/// <reference types="npm:@types/react@18.3.1" />

// Gemeinsames Layout für alle CritiCore-Mails, angelehnt an die Webseite:
// dunkler Hintergrund, Logo wie in der Navbar, Karte mit 18px-Radius,
// Glacial-Indifference-Überschrift, blauer Pill-Button und Footer wie auf der Seite.

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { t, type EmailLang } from './email-i18n.ts'
import { ASSETS, COLORS, FOOTER_LINKS, SITE_URL, SOCIALS } from './email-assets.ts'

const SANS = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const DISPLAY = "'Glacial Indifference', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

const headStyles = `
  @font-face {
    font-family: 'Glacial Indifference';
    src: url('${ASSETS.displayFont}') format('opentype');
    font-weight: 700;
    font-style: normal;
  }
  :root { color-scheme: dark; supported-color-schemes: dark; }
  .cc-link:hover { color: ${COLORS.foreground} !important; }
  @media only screen and (max-width: 600px) {
    .cc-shell { padding: 20px 12px 32px !important; }
    .cc-card { padding: 28px 22px 26px !important; }
    .cc-h1 { font-size: 27px !important; }
  }
`

interface EmailLayoutProps {
  lang: EmailLang
  preview: string
  /** Kleine Zeile über der Überschrift, z. B. "Fast geschafft" */
  eyebrow?: string
  heading: string
  /** Hinweis ganz unten, Standard: "…weil du ein CritiCore-Konto hast" */
  notice?: string
  children: React.ReactNode
}

export const EmailLayout = ({ lang, preview, eyebrow, heading, notice, children }: EmailLayoutProps) => (
  <Html lang={lang} dir="ltr">
    <Head>
      <meta name="color-scheme" content="dark" />
      <meta name="supported-color-schemes" content="dark" />
      {/* Als Text würde React die Anführungszeichen escapen und das CSS zerstören */}
      <style dangerouslySetInnerHTML={{ __html: headStyles }} />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container className="cc-shell" style={shell}>
        {/* Kopf wie die Navbar: Logo links, Domain rechts */}
        <Section style={{ padding: '0 4px 20px' }}>
          <Row>
            <Column style={{ verticalAlign: 'middle' }}>
              <Link href={SITE_URL}>
                <Img src={ASSETS.logo} width="132" height="28" alt="CritiCore" style={{ display: 'block', border: 0 }} />
              </Link>
            </Column>
            <Column align="right" style={{ verticalAlign: 'middle' }}>
              <Link href={SITE_URL} className="cc-link" style={headerLink}>criticore.cc</Link>
            </Column>
          </Row>
        </Section>

        <Section className="cc-card" style={card}>
          {eyebrow && <Text style={eyebrowStyle}>{eyebrow.replace(/\s*:\s*$/, '')}</Text>}
          <Heading as="h1" className="cc-h1" style={h1}>{heading}</Heading>
          {children}
        </Section>

        <EmailFooter lang={lang} notice={notice ?? t('shared.accountNotice', lang)} />
      </Container>
    </Body>
  </Html>
)

const EmailFooter = ({ lang, notice }: { lang: EmailLang; notice: string }) => (
  <Section style={{ padding: '32px 4px 0' }}>
    <Text style={{ ...small, margin: '0 0 16px' }}>{t('shared.tagline', lang)}</Text>
    <table cellPadding="0" cellSpacing="0" border={0} role="presentation" style={{ marginBottom: '20px' }}>
      <tbody>
        <tr>
          {[
            { href: SOCIALS.x, src: ASSETS.iconX, alt: 'X' },
            { href: SOCIALS.bluesky, src: ASSETS.iconBluesky, alt: 'Bluesky' },
            { href: SOCIALS.instagram, src: ASSETS.iconInstagram, alt: 'Instagram' },
            { href: SOCIALS.tiktok, src: ASSETS.iconTiktok, alt: 'TikTok' },
          ].map((s) => (
            <td key={s.alt} style={{ paddingRight: '8px' }}>
              <Link href={s.href}>
                <Img src={s.src} width="36" height="36" alt={s.alt} style={{ display: 'block', border: 0 }} />
              </Link>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
    <Text style={{ ...small, margin: '0' }}>
      <Link href={FOOTER_LINKS.help} className="cc-link" style={footerLink}>{t('shared.help', lang)}</Link>
      <span style={{ color: COLORS.subtle }}>{'  ·  '}</span>
      <Link href={FOOTER_LINKS.privacy} className="cc-link" style={footerLink}>{t('shared.privacy', lang)}</Link>
      <span style={{ color: COLORS.subtle }}>{'  ·  '}</span>
      <Link href={FOOTER_LINKS.terms} className="cc-link" style={footerLink}>{t('shared.terms', lang)}</Link>
    </Text>
    <Hr style={{ borderColor: COLORS.border, borderTopWidth: '1px', margin: '20px 0 16px' }} />
    <Text style={{ ...tiny, margin: '0 0 6px' }}>{t('shared.copyright', lang)}</Text>
    <Text style={{ ...tiny, margin: '0 0 6px' }}>{t('shared.support', lang)}</Text>
    <Text style={{ ...tiny, margin: '0' }}>{notice}</Text>
  </Section>
)

/* ── Bausteine für den Inhalt der Karte ── */

export const Paragraph = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <Text style={{ ...paragraph, ...style }}>{children}</Text>
)

export const Strong = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: COLORS.foreground, fontWeight: 600 }}>{children}</strong>
)

export const CtaButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ padding: '8px 0 4px' }}>
    <Button href={href} style={button}>{children}</Button>
  </Section>
)

/** "Button geht nicht?" mit dem vollen Link für Mail-Programme, die Buttons blockieren */
export const LinkFallback = ({ href, lang }: { href: string; lang: EmailLang }) => (
  <Text style={{ ...small, margin: '20px 0 0' }}>
    {t('shared.linkFallback', lang)}{' '}
    <Link href={href} style={{ color: COLORS.accentLight, textDecoration: 'none', wordBreak: 'break-all' }}>{href}</Link>
  </Text>
)

/** Abgesetzter Hinweis unter einer Linie, z. B. "Nicht du? Dann ignoriere diese E-Mail." */
export const Note = ({ title, text, lang }: { title: string; text: string; lang: EmailLang }) => {
  // Einige Übersetzungen enden ohne Punkt; im Fließtext wirkt das abgeschnitten
  const body = lang !== 'th' && /\p{L}$/u.test(text) ? `${text}.` : text
  return (
    <>
      <Hr style={{ borderColor: COLORS.border, borderTopWidth: '1px', margin: '28px 0 20px' }} />
      <Text style={{ ...small, margin: '0' }}>
        <Strong>{title}</Strong> {body}
      </Text>
    </>
  )
}

/** Code-Feld für OTP/Bestätigungscodes */
export const CodeBox = ({ label, code }: { label: string; code: string }) => (
  <Section style={codeBox}>
    <Text style={{ ...small, margin: '0 0 6px' }}>{label.replace(/\s*:\s*$/, '')}</Text>
    <Text style={codeText}>{code}</Text>
  </Section>
)

/** Kleine Tabelle mit Label/Wert-Zeilen, z. B. Ticket-Nr. und Betreff */
export const Details = ({ rows }: { rows: { label: string; value: React.ReactNode }[] }) => (
  <Section style={detailsBox}>
    <table cellPadding="0" cellSpacing="0" border={0} role="presentation" style={{ width: '100%' }}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.label}>
            <td style={{ ...detailCell, color: COLORS.mutedForeground, width: '38%', borderTop: i ? `1px solid ${COLORS.border}` : 'none' }}>
              {row.label}
            </td>
            <td style={{ ...detailCell, color: COLORS.foreground, fontWeight: 600, borderTop: i ? `1px solid ${COLORS.border}` : 'none', wordBreak: 'break-word' }}>
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Section>
)

/* ── Styles ── */

const body: React.CSSProperties = {
  backgroundColor: COLORS.background,
  color: COLORS.foreground,
  fontFamily: SANS,
  margin: '0',
  padding: '0',
  WebkitFontSmoothing: 'antialiased',
}
const shell: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '36px 16px 48px' }
const headerLink: React.CSSProperties = { color: COLORS.mutedForeground, fontSize: '13px', textDecoration: 'none' }
const card: React.CSSProperties = {
  backgroundColor: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '18px',
  padding: '36px 36px 32px',
}
const eyebrowStyle: React.CSSProperties = {
  color: COLORS.accentLight,
  fontSize: '13px',
  fontWeight: 600,
  lineHeight: '18px',
  letterSpacing: '0.02em',
  margin: '0 0 10px',
}
const h1: React.CSSProperties = {
  color: COLORS.foreground,
  fontFamily: DISPLAY,
  fontSize: '32px',
  fontWeight: 700,
  lineHeight: '1.15',
  letterSpacing: '-0.01em',
  margin: '0 0 16px',
}
const paragraph: React.CSSProperties = {
  color: COLORS.mutedForeground,
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 24px',
}
const small: React.CSSProperties = { color: COLORS.mutedForeground, fontSize: '13px', lineHeight: '20px' }
const tiny: React.CSSProperties = { color: COLORS.subtle, fontSize: '12px', lineHeight: '18px' }
const footerLink: React.CSSProperties = { color: COLORS.mutedForeground, textDecoration: 'none' }
const button: React.CSSProperties = {
  backgroundColor: COLORS.primary,
  color: COLORS.primaryForeground,
  fontFamily: SANS,
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: '20px',
  textDecoration: 'none',
  textAlign: 'center',
  borderRadius: '9999px',
  padding: '14px 28px',
  display: 'inline-block',
}
const codeBox: React.CSSProperties = {
  backgroundColor: COLORS.secondary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '18px 20px',
  textAlign: 'center',
  margin: '4px 0 0',
}
const codeText: React.CSSProperties = {
  color: COLORS.foreground,
  fontFamily: MONO,
  fontSize: '32px',
  fontWeight: 700,
  lineHeight: '40px',
  letterSpacing: '0.28em',
  margin: '0',
}
const detailsBox: React.CSSProperties = {
  backgroundColor: COLORS.secondary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
  padding: '4px 18px',
  margin: '0 0 24px',
}
const detailCell: React.CSSProperties = { fontSize: '14px', lineHeight: '20px', padding: '12px 0', verticalAlign: 'top' }
