/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from './email-i18n.ts'
import { CodeBox, EmailLayout, Note, Paragraph } from './layout.tsx'

interface ReauthenticationEmailProps {
  token: string
  lang?: EmailLang
}

export const ReauthenticationEmail = ({ token, lang = 'de' }: ReauthenticationEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={`${t('reauth.preview', lang)}${token}`}
    eyebrow={t('reauth.col1Title', lang)}
    heading={t('reauth.heading', lang)}
  >
    <Paragraph>{t('reauth.col1Text', lang)}</Paragraph>
    <CodeBox label={t('reauth.codeLabel', lang)} code={token} />
    <Note title={t('reauth.col2Title', lang)} text={t('reauth.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default ReauthenticationEmail
