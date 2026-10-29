import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE_URL = "https://criticore.cc";

const LOCALE_NEWS_PATHS: Record<string, string> = {
  "de-DE": "/de-DE/news",
  "en-US": "/en-US/news",
  "fr-FR": "/fr-FR/actualites",
  "es-ES": "/es-ES/noticias",
  "th-TH": "/th-TH/news",
};

const HREFLANGS: Record<string, string> = {
  "de-DE": "de",
  "en-US": "en",
  "fr-FR": "fr",
  "es-ES": "es",
  "th-TH": "th",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, updated_at, language, category")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const urls: string[] = [];

    // Locale news landing pages (always include)
    for (const [locale, path] of Object.entries(LOCALE_NEWS_PATHS)) {
      const alternates = Object.entries(LOCALE_NEWS_PATHS)
        .map(
          ([loc, p]) =>
            `    <xhtml:link rel="alternate" hreflang="${HREFLANGS[loc]}" href="${BASE_URL}${p}"/>`,
        )
        .join("\n");

      urls.push(
        `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
${alternates}
  </url>`,
      );
    }

    // Individual articles
    for (const article of articles ?? []) {
      const langPath =
        article.language === "de"
          ? "de-DE"
          : article.language === "en"
            ? "en-US"
            : article.language === "fr"
              ? "fr-FR"
              : article.language === "es"
                ? "es-ES"
                : article.language === "th"
                  ? "th-TH"
                  : "de-DE";

      const lastmod = new Date(article.updated_at).toISOString().split("T")[0];
      urls.push(
        `  <url>
    <loc>${BASE_URL}/${langPath}/news/${escapeXml(article.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("sitemap-news error:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  }
});
