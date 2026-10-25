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

## Signing in when running locally

Use the **Sign in** tab with an existing email and password, or choose **Create account** to register. Supabase may require email confirmation before password sign-in works. The **Email link** tab is also available, and supports entering a code only when the email template actually sends a code.

For email-link and account-confirmation redirects to return to your local app, add your exact development URL to **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**:

- `http://localhost:5173/**`
- `http://127.0.0.1:5173/**`
- `https://mind-blogging-jd-ff4c.vercel.app/**`

The preview URL can differ if Vite chooses another port; add that origin too. Make sure **Authentication → Providers → Email** allows the desired authentication mode, and complete confirmation messages before signing in. Do not put a service-role key into local source.

**Important:** This commit was TypeScript-checked and built, but a complete real email/password login has not been tested with a confirmed account. The hosted production URL continues to run its previous deployment; these repository changes are for the local source until redeployed.

## Google-only sign-in (preview implementation)

The single **Continue with Google** button signs in existing users and creates accounts for new users. It replaces the previous email/password and magic-link forms in the `feature/google-only-auth` branch.

Google OAuth **is not configured yet** on this Supabase project (`external.google=false` as checked on 2026-10-26). The branch intentionally checks provider availability and shows an actionable message rather than sending users into a broken sign-in flow.

**To make sign-in functional:**

1. In the [Google Cloud Auth Platform](https://console.cloud.google.com/auth/clients), configure your OAuth consent screen (External audience for regular Google accounts; add test users while testing) and create an **OAuth client ID** of type **Web application**.
2. Set Authorized JavaScript origins to `https://mind-blogging-jd-ff4c.vercel.app` (and your local address such as `http://localhost:5173` when developing). Set the **Authorized redirect URI** to `https://laodxcqxfbzoeetlfxyd.supabase.co/auth/v1/callback`. Do not substitute your Vercel URL for this Google callback.
3. Open the [Supabase Google provider settings](https://supabase.com/dashboard/project/laodxcqxfbzoeetlfxyd/auth/providers), enable Google, and enter the **Client ID and Client Secret privately inside Supabase**. Never paste the secret into a chat or commit it to GitHub.
4. Under [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/laodxcqxfbzoeetlfxyd/auth/url-configuration), add `https://mind-blogging-jd-ff4c.vercel.app/**`, the preview domain, and development redirect patterns you use. Set the Site URL to the production site.
5. Test first-time account creation and returning-user sign-in in a browser. Check the session survives reload and leads to a private workspace.

**Release safeguard:** Do not deploy this Google-only branch to production until the Google provider is enabled and end-to-end sign-in succeeds; the existing site otherwise would have no functioning authentication method.
