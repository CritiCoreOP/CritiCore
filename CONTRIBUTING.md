# Contributing

Thanks for helping with CritiCore.

- Open an issue first for larger changes, so we can agree on the approach.
- Use npm only (no other lockfiles). Keep `legacy-peer-deps` in `.npmrc`.
- New UI texts go into all five locale files in `src/i18n/locales/`.
- Never change existing migrations in `supabase/migrations/`; add a new one with a timestamp prefix. Every new table gets row-level security and policies.
- Call extension functions with their schema, e.g. `extensions.gen_random_bytes(…)`.
- No hard-coded Supabase URLs or project refs: use `import.meta.env.VITE_SUPABASE_URL` in the frontend and `Deno.env.get("SUPABASE_URL")` in edge functions.
- Never commit secrets, service-role keys or `.env` values.
- Before a pull request: `npm run lint`, `npm test` and, for UI changes, `npm run test:e2e`.

By contributing you agree that your contribution is licensed under the AGPL-3.0, like the rest of the code.
