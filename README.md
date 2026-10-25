# Mind Blogging — Beta

A private work-and-career journaling app with evidence tracking, reflections, reviews, goals, email authentication, and optional notifications.

**Status: beta.** This repository is a recovered, editable standalone implementation aligned with the running Vercel project. It is **not a byte-for-byte export** of all deployed backend files. The production site is [Mind Blogging](https://mind-blogging-jd-ff4c.vercel.app).

## Local development

Install Node.js 20+ and run:

```sh
npm install
npm run dev
```

The frontend uses the Supabase project configured in `src/cloud.ts`. Its publishable key is intended to be public; **do not** put service-role keys in client source.

## Deployment

Import the repository into Vercel as a Vite project. Set the following **server-side environment variables** in Vercel's project settings (never commit secret values):

- `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`: AI Gateway authentication
- `AI_GATEWAY_MODEL`: optional AI provider/model identifier
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: browser push signing
- `BLOB_READ_WRITE_TOKEN`: storage for push subscriptions
- `CRON_SECRET`: protects scheduled reminder endpoint

Allow your deployment URL in Supabase Auth redirect settings and use the same URL for email magic-link callbacks.

## Quality status

- Vercel production deployment and basic HTTP/API authentication smoke tests passed.
- Inline email sign-in form displayed and submitted in a browser.
- **Not verified end-to-end:** receiving/completing magic-link sign-in, AI text streaming and cancellation with a signed-in account, and actual device push delivery.
- The beta source adapter and reconstructed backend need full regression testing before treating this repository as a verified production release.
- The recovered UI includes some advanced actions (such as AI passage-action suggestions) whose backend support is incomplete in this beta.

The weekly push cron is scheduled for Monday at 09:00 Asia/Kolkata. Manage notification permission in the browser's site settings.

## Security

Supabase Row Level Security must be enabled for `public.mind_blog_records` with per-user policies on `user_id`. Never remove RLS to make the app work. Store private secrets only in deployment environment variables.
