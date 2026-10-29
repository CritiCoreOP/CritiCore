/// <reference types="npm:@types/react@18.3.1" />

// Mail on release day for people who set a reminder on a game, film, series or anime page.

import * as React from 'npm:react@18.3.1'
import { Img, Section } from 'npm:@react-email/components@0.0.22'

import { t, type EmailLang } from './email-i18n.ts'
import { CtaButton, EmailLayout, LinkFallback, Paragraph } from './layout.tsx'

interface ReleaseReminderEmailProps {
  lang: EmailLang
  title: string
  /** Release day, already written out in the mail's language */
  date: string
  url: string
  image?: string | null
}

export const ReleaseReminderEmail = ({ lang = 'de', title = 'Hollow Knight: Silksong', date = '4. September 2025', url = 'https://criticore.cc', image }: ReleaseReminderEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={t('release.preview', lang).replace('{title}', title)}
    eyebrow={t('release.eyebrow', lang)}
    heading={t('release.subject', lang).replace('{title}', title)}
    notice={t('release.notice', lang)}
  >
    {image && (
      <Section style={{ margin: '0 0 20px' }}>
        <Img src={image} width="160" alt="" style={{ display: 'block', width: '160px', maxWidth: '100%', height: 'auto', borderRadius: '12px', border: 0 }} />
      </Section>
    )}
    <Paragraph>{t('release.text', lang).replace('{title}', title).replace('{date}', date)}</Paragraph>
    <CtaButton href={url}>{t('release.button', lang)}</CtaButton>
    <LinkFallback href={url} lang={lang} />
  </EmailLayout>
)

export default ReleaseReminderEmail
