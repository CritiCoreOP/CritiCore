/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CodeBox, CtaButton, EmailLayout, LinkFallback, Note, Paragraph } from './layout.tsx'

interface RecoveryEmailProps {
  confirmationUrl: string
  // Same one-time code as the link, for signing in on the page (e.g. when the mail app opens links elsewhere)
  token?: string
  lang?: EmailLang
}

export const RecoveryEmail = ({ confirmationUrl, token, lang = 'de' }: RecoveryEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('recovery.preview', lang)}
    eyebrow={t('recovery.col1Title', lang)}
    heading={t('recovery.heading', lang)}
  >
    <Paragraph>{t('recovery.col1Text', lang)}</Paragraph>
    <CtaButton href={confirmationUrl}>{t('recovery.button', lang)}</CtaButton>
    <LinkFallback href={confirmationUrl} lang={lang} />
    {token && <CodeBox label={t('code.orEnter', lang)} code={token} />}
    <Note title={t('recovery.col2Title', lang)} text={t('recovery.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default RecoveryEmail
