/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CtaButton, EmailLayout, LinkFallback, Note, Paragraph } from './layout.tsx'

interface InviteEmailProps {
  confirmationUrl: string
  lang?: EmailLang
}

export const InviteEmail = ({ confirmationUrl, lang = 'de' }: InviteEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('invite.preview', lang)}
    eyebrow={t('invite.col1Title', lang)}
    heading={t('invite.heading', lang)}
  >
    <Paragraph>{t('invite.col1Text', lang)}</Paragraph>
    <CtaButton href={confirmationUrl}>{t('invite.button', lang)}</CtaButton>
    <LinkFallback href={confirmationUrl} lang={lang} />
    <Note title={t('invite.col2Title', lang)} text={t('invite.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default InviteEmail
