# Laricake

Foundation project with Next.js App Router and Supabase Auth.

## Features implemented (Phase 2)

- Google OAuth login
- Email/password registration
- Email/password login
- Logout
- Forgot password
- Password reset
- Auth persistence via Supabase session cookies
- Protected route for `/dashboard`
- Redirect unauthenticated users from `/dashboard` to `/login`
- Redirect authenticated users from `/login` and `/register` to `/dashboard`

## Environment variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Supabase configuration

### 1) Authentication providers

In Supabase dashboard:

1. Open Authentication -> Providers.
2. Enable Google.
3. Add your Google OAuth client ID and secret.

If you see `Unsupported provider: provider is not enabled`, the Google provider is still disabled for the current Supabase project.

Do not hard-code credentials in the app.

### 2) Redirect URLs

In Supabase dashboard:

1. Open Authentication -> URL Configuration.
2. Set Site URL:
   - `http://localhost:3000` (local development)
3. Add Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback`

For password reset links, the app sends users through:

- `/auth/callback?next=/reset-password`

So `/auth/callback` must be in your allowed redirect URLs.

## Local development

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Open:

- `http://localhost:3000/login`
- `http://localhost:3000/register`
- `http://localhost:3000/forgot-password`
- `http://localhost:3000/reset-password`
- `http://localhost:3000/dashboard`

## Notes

- This project uses Supabase recommended SSR auth flow for Next.js with middleware and server-side session checks.
- No password or token is stored manually.
- No service-role key is exposed in frontend code.
