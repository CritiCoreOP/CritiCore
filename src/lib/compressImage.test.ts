import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage, AVATAR_IMAGE } from "./compressImage";

/** A browser stand-in: decodes every file to the given size and encodes to a 1 kB blob of the asked type */
function fakeBrowser(width: number, height: number, encodes = "image/webp") {
  const drawn: number[][] = [];
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width, height, close: () => undefined })));
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(public width: number, public height: number) {}
      getContext() {
        return { drawImage: (_b: unknown, ...rect: number[]) => drawn.push(rect), imageSmoothingQuality: "low" };
      }
      async convertToBlob({ type }: { type: string }) {
        return new Blob([new Uint8Array(1024)], { type: type === "image/webp" ? encodes : type });
      }
    },
  );
  return drawn;
}

const photo = (type = "image/jpeg", bytes = 2_000_000, name = "IMG_1234.JPG") => new File([new Uint8Array(bytes)], name, { type });

afterEach(() => vi.unstubAllGlobals());

describe("compressImage", () => {
  it("scales big photos to the long side and stores them as WebP", async () => {
    const drawn = fakeBrowser(4032, 3024);
    const out = await compressImage(photo());
    expect(out.type).toBe("image/webp");
    expect(out.name).toBe("IMG_1234.webp");
    expect(out.size).toBe(1024);
    expect(drawn[0]).toEqual([0, 0, 2048, 1536]);
  });

  it("makes avatars small", async () => {
    const drawn = fakeBrowser(3000, 4000);
    await compressImage(photo("image/png", 900_000, "me.png"), AVATAR_IMAGE);
    expect(drawn[0]).toEqual([0, 0, 384, 512]);
  });

  it("leaves GIFs, small pictures and undecodable files alone", async () => {
    fakeBrowser(4000, 4000);
    const gif = photo("image/gif");
    expect(await compressImage(gif)).toBe(gif);

    fakeBrowser(800, 600);
    const small = photo("image/jpeg", 120_000);
    expect(await compressImage(small)).toBe(small);

    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("broken"); }));
    const broken = photo();
    expect(await compressImage(broken)).toBe(broken);
  });

  it("falls back to JPEG where the browser cannot write WebP", async () => {
    fakeBrowser(4000, 3000, "image/png");
    const out = await compressImage(photo());
    expect(out.type).toBe("image/jpeg");
    expect(out.name).toBe("IMG_1234.jpg");
  });
});
