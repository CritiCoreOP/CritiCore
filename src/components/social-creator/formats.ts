export interface SocialFormat {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
}

/** All common social media post formats. */
export const SOCIAL_FORMATS: SocialFormat[] = [
  { id: "ig-post", label: "Instagram Post", platform: "Instagram", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram Portrait", platform: "Instagram", width: 1080, height: 1350 },
  { id: "ig-story", label: "Story / Reel", platform: "Instagram", width: 1080, height: 1920 },
  { id: "x-post", label: "X / Twitter Post", platform: "X", width: 1200, height: 675 },
  { id: "x-header", label: "X Header", platform: "X", width: 1500, height: 500 },
  { id: "fb-post", label: "Facebook Post", platform: "Facebook", width: 1200, height: 630 },
  { id: "yt-thumb", label: "YouTube Thumbnail", platform: "YouTube", width: 1280, height: 720 },
  { id: "li-post", label: "LinkedIn Post", platform: "LinkedIn", width: 1200, height: 1200 },
  { id: "tiktok", label: "TikTok", platform: "TikTok", width: 1080, height: 1920 },
  { id: "og-image", label: "OG / Web Banner", platform: "Web", width: 1200, height: 630 },
];

export const getFormat = (id: string): SocialFormat =>
  SOCIAL_FORMATS.find((f) => f.id === id) || SOCIAL_FORMATS[0];
