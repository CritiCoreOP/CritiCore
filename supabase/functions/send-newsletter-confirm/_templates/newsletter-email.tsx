/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { t, type EmailLang } from '../../_shared/email-templates/email-i18n.ts'
import { CtaButton, EmailLayout, LinkFallback, Note, Paragraph } from '../../_shared/email-templates/layout.tsx'

interface NewsletterConfirmEmailProps {
  confirmUrl: string
  lang?: EmailLang
}

export const NewsletterConfirmEmail = ({ confirmUrl, lang = 'de' }: NewsletterConfirmEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('newsletter.preview', lang)}
    eyebrow={t('newsletter.col1Title', lang)}
    heading={t('newsletter.heading', lang)}
    notice={t('newsletter.notice', lang)}
  >
    <Paragraph>{t('newsletter.col1Text', lang)}</Paragraph>
    <CtaButton href={confirmUrl}>{t('newsletter.button', lang)}</CtaButton>
    <LinkFallback href={confirmUrl} lang={lang} />
    <Note title={t('newsletter.col2Title', lang)} text={t('newsletter.col2Text', lang)} lang={lang} />
  </EmailLayout>
)

export default NewsletterConfirmEmail
