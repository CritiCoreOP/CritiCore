# CritiCore

News and honest reviews for games, movies, series and anime – the code behind [criticore.cc](https://criticore.cc), part of the TGN News Network.

The site is available in German, English, Spanish, French and Thai.

## Stack

- **Frontend:** React 18, TypeScript, Vite 8, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres with row-level security, Auth, Storage, Edge Functions on Deno)
- **Hosting:** Cloudflare Pages, with Pages Functions in `functions/` for share previews, sitemaps and a cache in front of read-only edge functions
- **AI:** every model call goes through one OpenAI-compatible gateway (OpenRouter by default)
- **Mail:** Resend, sent through pgmq queues

## Getting started

Requirements: Node.js 20.19 or newer (Vite 8) and npm (the repo uses `package-lock.json`; `.npmrc` sets `legacy-peer-deps` for a TipTap peer conflict).

```bash
npm install
cp .env.example .env   # then fill in your own Supabase project
npm run dev            # http://localhost:8080
```

`.env` needs the URL and the anon (legacy JWT) key of your Supabase project:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

### Your own Supabase project

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push                                 # applies supabase/migrations
npx supabase functions deploy <name> --use-api       # one edge function, no Docker needed
npx supabase secrets set NAME=value                  # secrets for the edge functions
```

Set `project_id` in `supabase/config.toml` to your project ref. `verify_jwt` is configured per function in the same file. `supabase/manual/` holds cron jobs with placeholders; run them once in the SQL editor with your own values and never commit real keys.

The edge functions read these secrets (only set what you use):

| Area | Secrets |
| --- | --- |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| AI gateway | `AI_API_KEY`, optional `AI_GATEWAY_URL`, `AI_MODEL`, `AI_MODEL_LITE`, `AI_CHAT_MODEL`, `AI_ENRICH_MODEL`, `ENRICH_MAX_PER_HOUR` |
| Media data | `TMDB_API_KEY`, `TMDB_READ_TOKEN`, `OMDB_API_KEY`, `RAWG_API_KEY`, `TVDB_API_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` |
| Mail | `RESEND_API_KEY`, `EMAIL_FROM`, `SEND_EMAIL_HOOK_SECRET` |
| Optional | `STRIPE_SECRET_KEY`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `BLUESKY_SERVICE`, `TGN_APIKEY`, `TGN_SUPABASE_URL` |

After a schema change, regenerate the types:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/integrations/supabase/types.ts
```

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright)
```

## Translations

UI texts live in `src/i18n/locales/{de,en,es,fr,th}.json`. New texts go into all five files.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

The code is licensed under the [GNU Affero General Public License v3.0](LICENSE). If you run a modified version as a website, you have to offer its source code to its users.

### Name and logos

The name **CritiCore**, the CritiCore and TGN logos and the other brand images (for example in `public/static/` and `src/assets/`) are **not** covered by the license. They are in the repository so the project builds as it is. If you publish a fork, replace them with your own name and artwork.
