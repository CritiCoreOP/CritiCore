/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Link, Text } from 'npm:@react-email/components@0.0.22'

import { t, type EmailLang } from '../../_shared/email-templates/email-i18n.ts'
import { COLORS } from '../../_shared/email-templates/email-assets.ts'
import { CtaButton, Details, EmailLayout, Paragraph, Strong } from '../../_shared/email-templates/layout.tsx'

interface TicketEmailProps {
  ticketId: string
  fullTicketId?: string
  ticketType: 'support' | 'dmca'
  subject?: string
  lang?: EmailLang
}

export const TicketEmail = ({
  ticketId = '00000000',
  fullTicketId = '',
  ticketType = 'support',
  subject = '',
  lang = 'de',
}: TicketEmailProps) => {
  const isDmca = ticketType === 'dmca'
  const ticketText = isDmca
    ? t('ticket.col1TextDmca', lang).replace('{id}', ticketId)
    : t('ticket.col1TextSupport', lang).replace('{id}', ticketId)

  const rows = [{ label: t('ticket.idLabel', lang), value: `#${ticketId}` }]
  if (subject) rows.push({ label: t('ticket.subjectLabel', lang), value: subject })

  return (
    <EmailLayout
      lang={lang}
      preview={t('ticket.preview', lang).replace('{id}', ticketId)}
      eyebrow={isDmca ? 'DMCA' : t('ticket.col1Title', lang)}
      heading={t('ticket.heading', lang)}
      notice={t('ticket.notice', lang)}
    >
      <Paragraph>{ticketText}</Paragraph>
      <Details rows={rows} />
      <Paragraph>
        <Strong>{t('ticket.col2Title', lang)}</Strong> {t('ticket.col2Text', lang)}
        {isDmca && (
          <>
            {' '}
            <span style={{ color: COLORS.accentLight, fontWeight: 600 }}>{t('ticket.dmcaPriority', lang)}</span>
          </>
        )}
      </Paragraph>
      <CtaButton href={`https://criticore.tgn.news/ticket/${fullTicketId || ticketId}`}>
        {t('ticket.button', lang)}
      </CtaButton>
      <Text style={{ color: COLORS.mutedForeground, fontSize: '13px', lineHeight: '20px', margin: '20px 0 0' }}>
        {t('ticket.fallback', lang)}{' '}
        <Link href="mailto:Support@redaim.de" style={{ color: COLORS.accentLight, textDecoration: 'none' }}>
          Support@redaim.de
        </Link>
      </Text>
    </EmailLayout>
  )
}

export default TicketEmail
