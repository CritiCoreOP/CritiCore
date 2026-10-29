// Gemeinsame URLs und Farben für alle CritiCore-Mails.
// Die Bilder liegen in public/static/email und werden mit der Webseite ausgeliefert.
export const SITE_URL = 'https://criticore.cc'
const ASSET_BASE = `${SITE_URL}/static/email`

export const ASSETS = {
  logo: `${ASSET_BASE}/criticore-logo.png`,
  iconX: `${ASSET_BASE}/icon-x.png`,
  iconBluesky: `${ASSET_BASE}/icon-bluesky.png`,
  iconInstagram: `${ASSET_BASE}/icon-instagram.png`,
  iconTiktok: `${ASSET_BASE}/icon-tiktok.png`,
  displayFont: `${SITE_URL}/fonts/GlacialIndifference-Bold.otf`,
} as const

export const SOCIALS = {
  x: 'https://x.com/CritiCoretgn',
  bluesky: 'https://bsky.app/profile/criticore.cc',
  instagram: 'https://www.instagram.com/criticoretgn/',
  tiktok: 'https://www.tiktok.com/@criticoretgn/',
  website: SITE_URL,
} as const

export const FOOTER_LINKS = {
  help: `${SITE_URL}/support`,
  privacy: `${SITE_URL}/datenschutz`,
  terms: `${SITE_URL}/agb`,
} as const

// Dunkles Theme aus src/index.css (HSL-Tokens in Hex umgerechnet)
export const COLORS = {
  background: '#1e1f24',
  card: '#25262d',
  secondary: '#2e2f38',
  border: '#383a42',
  foreground: '#e7eaf8',
  mutedForeground: '#a1a5ba',
  subtle: '#8a8ea3',
  primary: '#1256c4',
  primaryForeground: '#ffffff',
  accentLight: '#5c90f0',
} as const
