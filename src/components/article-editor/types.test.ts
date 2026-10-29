import { describe, expect, it } from "vitest";
import { coverCreditColumns } from "./types";

describe("coverCreditColumns", () => {
  it("stays out of the payload while empty and the columns may be missing", () => {
    // Before migration 20261009120000 the columns do not exist; sending them would fail every save
    expect(coverCreditColumns("https://cdn.test/c.jpg", { credit: " ", url: "" }, false)).toEqual({});
  });

  it("sends trimmed credit and a normalized link", () => {
    expect(coverCreditColumns("https://cdn.test/c.jpg", { credit: "  Foto:  Jane Doe ", url: "unsplash.com/@jane" }, false)).toEqual({
      cover_image_credit: "Foto: Jane Doe",
      cover_image_credit_url: "https://unsplash.com/@jane",
    });
  });

  it("clears both when the cover is gone, the credit removed or the link unusable", () => {
    expect(coverCreditColumns(null, { credit: "Nintendo", url: "https://nintendo.com" }, true)).toEqual({ cover_image_credit: null, cover_image_credit_url: null });
    expect(coverCreditColumns("https://cdn.test/c.jpg", { credit: "", url: "https://nintendo.com" }, true)).toEqual({ cover_image_credit: null, cover_image_credit_url: null });
    expect(coverCreditColumns("https://cdn.test/c.jpg", { credit: "Nintendo", url: "javascript:alert(1)" }, true)).toEqual({ cover_image_credit: "Nintendo", cover_image_credit_url: null });
  });
});
