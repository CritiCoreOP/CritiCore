/**
 * Provider details for Impressum, AGB and Datenschutz. One place, so the three pages cannot drift
 * apart again (AGB and Datenschutz once named an old address while the Impressum had the current one).
 */
export const LEGAL_ENTITY = {
  /** Name the service appears under, first line of the postal address */
  brand: "CritiCore",
  /** Natural person running the service (§ 5 DDG) and responsible under § 18 Abs. 2 MStV; mail goes c/o this person */
  name: "Simon Althoff",
  /** Trading name, used in running text about who runs CritiCore */
  tradeName: "TGN",
  street: "Ufergarten 14",
  postalCode: "42651",
  city: "Solingen",
  country: "Deutschland",
  phone: "0212 38324842",
  email: "support@tgn.news",
} as const;

/** The postal address line by line, as Impressum and Datenschutz show it */
export const LEGAL_ADDRESS_LINES = [
  LEGAL_ENTITY.brand,
  `c/o ${LEGAL_ENTITY.name}`,
  LEGAL_ENTITY.street,
  `${LEGAL_ENTITY.postalCode} ${LEGAL_ENTITY.city}`,
  LEGAL_ENTITY.country,
] as const;

/** The responsible person with their address (§ 18 Abs. 2 MStV wants a natural person, not the brand) */
export const RESPONSIBLE_PERSON_LINES = [
  LEGAL_ENTITY.name,
  LEGAL_ENTITY.street,
  `${LEGAL_ENTITY.postalCode} ${LEGAL_ENTITY.city}`,
  LEGAL_ENTITY.country,
] as const;

/** "CritiCore, c/o Simon Althoff, Ufergarten 14, 42651 Solingen, Deutschland" for running text */
export const LEGAL_ENTITY_LINE = LEGAL_ADDRESS_LINES.join(", ");

/** Supervisory authority for the provider's seat (Solingen, Nordrhein-Westfalen) */
export const SUPERVISORY_AUTHORITY = {
  name: "Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen",
  address: "Kavalleriestraße 2-4, 40213 Düsseldorf",
  url: "https://www.ldi.nrw.de",
} as const;
