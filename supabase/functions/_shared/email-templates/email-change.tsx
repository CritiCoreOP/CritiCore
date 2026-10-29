/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CtaButton, Details, EmailLayout, LinkFallback, Note } from './layout.tsx'

interface EmailChangeEmailProps {
  email: string
  newEmail: string
  confirmationUrl: string
  lang?: EmailLang
}

// "Von " / " zu " aus dem Fließtext als Tabellen-Label nutzen
const label = (s: string) => {
  const trimmed = s.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, lang = 'de' }: EmailChangeEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('emailchange.preview', lang)}
    eyebrow={t('emailchange.col1Title', lang)}
    heading={t('emailchange.heading', lang)}
  >
    <Details
      rows={[
        { label: label(t('emailchange.col1TextPrefix', lang)), value: email },
        { label: label(t('emailchange.col1TextMiddle', lang)), value: newEmail },
      ]}
    />
    <CtaButton href={confirmationUrl}>{t('emailchange.button', lang)}</CtaButton>
    <LinkFallback href={confirmationUrl} lang={lang} />
    <Note title={t('emailchange.col2Title', lang)} text={t('emailchange.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default EmailChangeEmail
