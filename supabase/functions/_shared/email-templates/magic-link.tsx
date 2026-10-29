/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CodeBox, CtaButton, EmailLayout, LinkFallback, Note, Paragraph } from './layout.tsx'

interface MagicLinkEmailProps {
  confirmationUrl: string
  // Same one-time code as the link, for signing in on the page (e.g. when the mail app opens links elsewhere)
  token?: string
  lang?: EmailLang
}

export const MagicLinkEmail = ({ confirmationUrl, token, lang = 'de' }: MagicLinkEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('magiclink.preview', lang)}
    eyebrow={t('magiclink.col1Title', lang)}
    heading={t('magiclink.heading', lang)}
  >
    <Paragraph>{t('magiclink.col1Text', lang)}</Paragraph>
    <CtaButton href={confirmationUrl}>{t('magiclink.button', lang)}</CtaButton>
    <LinkFallback href={confirmationUrl} lang={lang} />
    {token && <CodeBox label={t('code.orEnter', lang)} code={token} />}
    <Note title={t('magiclink.col2Title', lang)} text={t('magiclink.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default MagicLinkEmail
