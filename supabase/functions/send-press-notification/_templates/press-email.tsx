/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { COLORS, SITE_URL } from '../../_shared/email-templates/email-assets.ts'
import { CtaButton, EmailLayout, Paragraph, Strong } from '../../_shared/email-templates/layout.tsx'

interface PressEmailProps {
  displayName: string
  verified: boolean
}

const PERKS = [
  'News-Artikel und Reviews verfassen',
  'Artikel veröffentlichen',
  'Als verifizierter Kritiker Bewertungen abgeben',
]

// Die Presse-Mails gibt es bisher nur auf Deutsch
export const PressEmail = ({ displayName, verified }: PressEmailProps) =>
  verified ? (
    <EmailLayout
      lang="de"
      preview="Dein Presse-Account bei CritiCore wurde verifiziert."
      eyebrow="Presse-Account"
      heading={`Willkommen im Presse-Team, ${displayName}!`}
    >
      <Paragraph>
        Dein Presse-Account bei <Strong>CritiCore</Strong> wurde erfolgreich verifiziert. Du kannst ab sofort:
      </Paragraph>
      <table cellPadding="0" cellSpacing="0" border={0} role="presentation" style={{ margin: '-8px 0 24px' }}>
        <tbody>
          {PERKS.map((perk) => (
            <tr key={perk}>
              <td style={{ color: COLORS.accentLight, fontSize: '15px', lineHeight: '26px', fontWeight: 700, paddingRight: '10px', verticalAlign: 'top' }}>
                ✓
              </td>
              <td style={{ color: COLORS.foreground, fontSize: '15px', lineHeight: '26px' }}>{perk}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <CtaButton href={SITE_URL}>Zu CritiCore</CtaButton>
      <Paragraph style={{ margin: '24px 0 0' }}>Viel Erfolg beim Schreiben! – Das CritiCore-Team</Paragraph>
    </EmailLayout>
  ) : (
    <EmailLayout
      lang="de"
      preview="Deine Presse-Verifizierung bei CritiCore wurde entzogen."
      eyebrow="Presse-Account"
      heading="Verifizierung entzogen"
    >
      <Paragraph>
        Hallo {displayName}, deine Presse-Verifizierung bei <Strong>CritiCore</Strong> wurde entzogen.
      </Paragraph>
      <Paragraph style={{ margin: '0' }}>Falls du Fragen hast, wende dich bitte an unser Team. – Das CritiCore-Team</Paragraph>
    </EmailLayout>
  )

export default PressEmail
