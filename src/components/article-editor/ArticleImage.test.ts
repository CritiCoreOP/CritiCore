import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { NodeSelection } from "@tiptap/pm/state";
import { sanitizeHtml } from "@/lib/sanitize";
import { ArticleImage, ImageRow } from "./ArticleImage";

let editor: Editor | null = null;
const make = (content: string) => (editor = new Editor({ extensions: [StarterKit, ArticleImage, ImageRow], content }));

const IMG = (n: number) => `https://cdn.test/${n}.jpg`;

/** Selects the n-th image in document order */
function selectImage(e: Editor, n: number) {
  let found = -1;
  let i = 0;
  e.state.doc.descendants((node, pos) => {
    if (node.type.name === "image") {
      if (i === n) found = pos;
      i++;
    }
  });
  e.view.dispatch(e.state.tr.setSelection(NodeSelection.create(e.state.doc, found)));
  return found;
}

const shape = (e: Editor) => {
  const out: string[] = [];
  e.state.doc.forEach((node) => {
    if (node.type.name === "imageRow") {
      const srcs: string[] = [];
      node.forEach((c) => srcs.push(String(c.attrs.src).match(/(\d+)\.jpg/)![1]));
      out.push(`row(${srcs.join(",")})`);
    } else if (node.type.name === "image") out.push(`img(${String(node.attrs.src).match(/(\d+)\.jpg/)![1]})`);
    else out.push(node.type.name === "paragraph" ? `p(${node.textContent})` : node.type.name);
  });
  // StarterKit keeps an empty paragraph after a final image, so writing can go on below it
  if (out[out.length - 1] === "p()") out.pop();
  return out.join(" ");
};

describe("ArticleImage", () => {
  afterEach(() => editor?.destroy());

  it("stores width, alignment, caption and a linked credit as a figure", () => {
    const e = make("<p>Text</p>");
    e.commands.setImage({ src: IMG(1), alt: "Link vor dem Schloss" });
    selectImage(e, 0);
    e.commands.setImageLayout({ align: "left" });
    e.commands.updateAttributes("image", { caption: "Das neue Hyrule", credit: "Nintendo", creditUrl: "https://nintendo.com/press" });
    const html = e.getHTML();
    expect(html).toContain('<figure class="article-image" data-align="left" style="width: 50%;">');
    expect(html).toContain(`<img src="${IMG(1)}" alt="Link vor dem Schloss">`);
    expect(html).toContain('<figcaption><span class="image-caption">Das neue Hyrule</span><span class="image-credit"><a href="https://nintendo.com/press" target="_blank" rel="noopener noreferrer nofollow">Nintendo</a></span></figcaption>');
  });

  it("reads its own HTML back unchanged, also after the sanitizer", () => {
    const stored =
      '<figure class="article-image" data-align="right" data-ratio="1.778" style="width: 42%;"><img src="https://cdn.test/1.jpg" alt="A"><figcaption><span class="image-caption">Unterschrift</span><span class="image-credit">Foto: Jane Doe</span></figcaption></figure>';
    const e = make(stored);
    expect(e.state.doc.child(0).attrs).toMatchObject({ width: 42, align: "right", ratio: 1.778, caption: "Unterschrift", credit: "Foto: Jane Doe", creditUrl: null });
    expect(e.getHTML()).toBe(stored);
    expect(sanitizeHtml(stored)).toBe(stored);
  });

  it("opens plain images from older articles as full-width, centred images", () => {
    const e = make('<p>Alt</p><img src="https://cdn.test/1.jpg" alt="x">');
    expect(e.state.doc.child(1).attrs).toMatchObject({ src: IMG(1), width: null, align: "center" });
    expect(e.getHTML()).toContain('<figure class="article-image"><img src="https://cdn.test/1.jpg" alt="x"></figure>');
  });

  it("gives a float half the column instead of the full width", () => {
    const e = make(`<p>a</p><img src="${IMG(1)}">`);
    selectImage(e, 0);
    e.commands.setImageLayout({ align: "right" });
    expect(e.state.doc.child(1).attrs).toMatchObject({ align: "right", width: 50 });
    e.commands.setImageLayout({ width: 100 });
    expect(e.state.doc.child(1).attrs.width).toBeNull();
    e.commands.setImageLayout({ width: 3 });
    expect(e.state.doc.child(1).attrs.width).toBe(15);
  });

  it("puts neighbouring images side by side and back below each other", () => {
    const e = make(`<p>a</p><img src="${IMG(1)}"><img src="${IMG(2)}"><p>b</p>`);
    selectImage(e, 0);
    expect(e.commands.joinImageWithNeighbour()).toBe(true);
    expect(shape(e)).toBe("p(a) row(1,2) p(b)");
    // Widths follow the aspect ratios (unknown here, so equal) and the selection stays on image 1
    const row = e.state.doc.child(1);
    expect([row.child(0).attrs.width, row.child(1).attrs.width]).toEqual([50, 50]);
    expect((e.state.selection as NodeSelection).node.attrs.src).toBe(IMG(1));

    expect(e.commands.splitImageRow()).toBe(true);
    expect(shape(e)).toBe("p(a) img(1) img(2) p(b)");
    expect(e.state.doc.child(1).attrs.width).toBeNull();
  });

  it("joins with the image before when there is none after, and stops at four", () => {
    const e = make(`<div class="image-row"><figure class="article-image"><img src="${IMG(1)}"></figure><figure class="article-image"><img src="${IMG(2)}"></figure><figure class="article-image"><img src="${IMG(3)}"></figure></div><img src="${IMG(4)}"><p>x</p>`);
    selectImage(e, 3);
    expect(e.commands.joinImageWithNeighbour()).toBe(true);
    expect(shape(e)).toBe("row(1,2,3,4) p(x)");
    expect(e.commands.addImageBeside(IMG(5))).toBe(false);
  });

  it("adds a new image beside the selected one", () => {
    const e = make(`<p>a</p><img src="${IMG(1)}"><p>b</p>`);
    const pos = selectImage(e, 0);
    e.commands.setTextSelection(1);
    // The upload takes a moment; the menu passes the image position along
    expect(e.commands.addImageBeside(IMG(2), pos)).toBe(true);
    expect(shape(e)).toBe("p(a) row(1,2) p(b)");
    expect((e.state.selection as NodeSelection).node.attrs.src).toBe(IMG(2));
  });

  it("moves an image (or its row) up and down, and within a row left and right", () => {
    const e = make(`<p>a</p><img src="${IMG(1)}"><p>b</p><img src="${IMG(2)}"><img src="${IMG(3)}">`);
    selectImage(e, 0);
    e.commands.moveImage(1);
    expect(shape(e)).toBe("p(a) p(b) img(1) img(2) img(3)");
    e.commands.moveImage(-1);
    e.commands.moveImage(-1);
    expect(shape(e)).toBe("img(1) p(a) p(b) img(2) img(3)");
    expect(e.commands.moveImage(-1)).toBe(false);

    selectImage(e, 1);
    e.commands.joinImageWithNeighbour();
    expect(shape(e)).toBe("img(1) p(a) p(b) row(2,3)");
    e.commands.moveImage(1, "row");
    expect(shape(e)).toBe("img(1) p(a) p(b) row(3,2)");
    e.commands.moveImage(-1);
    expect(shape(e)).toBe("img(1) p(a) row(3,2) p(b)");
    expect((e.state.selection as NodeSelection).node.attrs.src).toBe(IMG(2));
  });

  it("turns a row with one image left back into that image", () => {
    const e = make(`<div class="image-row"><figure class="article-image"><img src="${IMG(1)}"></figure><figure class="article-image"><img src="${IMG(2)}"></figure></div>`);
    selectImage(e, 1);
    e.commands.deleteSelection();
    expect(shape(e)).toBe("img(1)");
    expect(e.state.doc.child(0).attrs.width).toBeNull();
  });

  it("sizes images in a row by their aspect ratio, so they are equally tall", () => {
    const e = make(`<div class="image-row"><figure class="article-image" data-ratio="1.778"><img src="${IMG(1)}"></figure><figure class="article-image" data-ratio="0.8"><img src="${IMG(2)}"></figure></div>`);
    // Any edit runs the layout
    e.commands.insertContentAt(e.state.doc.content.size, "<p>x</p>");
    const row = e.state.doc.child(0);
    expect(row.child(0).attrs.width).toBeCloseTo(69, 0);
    expect(row.child(1).attrs.width).toBeCloseTo(31, 0);
  });

  it("drops data URLs and unsafe credit links", () => {
    const e = make('<img src="data:image/png;base64,AAAA"><figure class="article-image"><img src="https://cdn.test/1.jpg"><figcaption><span class="image-credit"><a href="javascript:alert(1)">X</a></span></figcaption></figure>');
    expect(e.getHTML()).not.toContain("data:image");
    expect(e.state.doc.lastChild?.attrs).toMatchObject({ credit: "X", creditUrl: null });
  });
});

describe("sanitizeHtml and image styles", () => {
  it("keeps a width in percent and nothing else", () => {
    expect(sanitizeHtml('<figure class="article-image" style="width: 33.3%"><img src="https://a.test/x.jpg"></figure>')).toContain('style="width: 33.3%;"');
    expect(sanitizeHtml('<figure style="position: fixed; inset: 0"><img src="https://a.test/x.jpg"></figure>')).not.toContain("style");
    expect(sanitizeHtml('<p style="width: 50%; background: url(x)">x</p>')).not.toContain("style");
    expect(sanitizeHtml('<figure style="width: 400%"></figure>')).not.toContain("style");
  });
});
