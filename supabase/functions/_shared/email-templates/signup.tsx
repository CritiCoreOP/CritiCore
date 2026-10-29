/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CodeBox, CtaButton, EmailLayout, LinkFallback, Note, Paragraph } from './layout.tsx'

interface SignupEmailProps {
  confirmationUrl: string
  // Same one-time code as the link, for signing in on the page (e.g. when the mail app opens links elsewhere)
  token?: string
  lang?: EmailLang
}

export const SignupEmail = ({ confirmationUrl, token, lang = 'de' }: SignupEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('signup.preview', lang)}
    eyebrow={t('signup.col1Title', lang)}
    heading={t('signup.heading', lang)}
  >
    <Paragraph>{t('signup.col1Text', lang)}</Paragraph>
    <CtaButton href={confirmationUrl}>{t('signup.button', lang)}</CtaButton>
    <LinkFallback href={confirmationUrl} lang={lang} />
    {token && <CodeBox label={t('code.orEnter', lang)} code={token} />}
    <Note title={t('signup.col2Title', lang)} text={t('signup.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default SignupEmail
