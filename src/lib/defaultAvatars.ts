import avatar1 from "@/assets/default-avatars/avatar-1.png";
import avatar2 from "@/assets/default-avatars/avatar-2.png";
import avatar3 from "@/assets/default-avatars/avatar-3.png";
import avatar4 from "@/assets/default-avatars/avatar-4.png";
import avatar5 from "@/assets/default-avatars/avatar-5.png";
import avatar6 from "@/assets/default-avatars/avatar-6.png";

export const DEFAULT_AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

/** Get a deterministic default avatar based on user ID */
export function getDefaultAvatar(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length];
}

/** Get a random default avatar */
export function getRandomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}

/** Generate a random username like "user_a3k9x" */
export function generateRandomUsername(): string {
  const adjectives = [
    "cool", "epic", "swift", "bold", "keen", "dark", "wild", "fast",
    "neon", "fire", "ice", "star", "nova", "luna", "pixel", "retro",
    "cyber", "turbo", "hyper", "mega", "ultra", "zen", "glow", "blaze",
  ];
  const nouns = [
    "fox", "wolf", "hawk", "lynx", "puma", "raven", "viper", "titan",
    "sage", "ghost", "spark", "storm", "blade", "drift", "echo", "pulse",
    "byte", "chip", "node", "core", "flux", "wave", "quest", "knight",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}_${noun}${num}`;
}
