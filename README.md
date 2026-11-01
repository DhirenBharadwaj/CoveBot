# Discord art voting site (Vercel version)

No always-on bot. When someone opens the site, serverless functions read #art from Discord, votes live in a
free Upstash Redis database, and the top 3 are locked in the first time anyone visits after Sunday midnight
(plus a daily backup job). Winners are announced in Discord.

```
public/   index.html, style.css, app.js
api/      state, vote, showcase, img, cron, auth/{login,callback,logout}
lib/      Discord, Redis, week maths, login cookies
```

## 1. Discord app
Use the app you already made (or create one at https://discord.com/developers/applications).
- **Bot** tab: copy the token (`BOT_TOKEN`) and keep **Message Content Intent** on.
- The bot must be in your server (invite URL with only the `bot` scope) with View Channel, Read Message History
  and Send Messages. It will show as offline. That is normal here.
- **OAuth2** tab: copy the Client ID and Client Secret. You'll add the redirect in step 5.

## 2. Put the code on GitHub
Create a **private** repo and upload the contents of this folder (`.env` is ignored, so secrets stay off GitHub).

## 3. Import into Vercel
vercel.com → **Add New → Project** → pick the repo → Deploy. No build settings needed. It's free on the Hobby
plan for personal, non-commercial use.

## 4. Add the database
In the project: **Storage / Marketplace → Upstash Redis** (free plan) → connect it to the project.
This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.

## 5. Environment variables
Project → **Settings → Environment Variables** → add everything in `.env.example`:
`BOT_TOKEN, GUILD_ID, ART_CHANNEL_ID, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SITE_URL, SECRET_KEY,
CRON_SECRET, TIMEZONE` (and optionally `SERVER_NAME, INVITE_URL, ANNOUNCE_CHANNEL_ID`).

`SITE_URL` is your site's address, e.g. `https://your-project.vercel.app` (no trailing slash).
Then in the Discord Developer Portal → **OAuth2 → Redirects**, add `SITE_URL/auth/callback` and **Save**.
Finally **Redeploy** in Vercel so the variables take effect.

## How it behaves
- A week is Monday 00:00 to Sunday 24:00 in `TIMEZONE`. Everyone gets 3 votes a week and can't vote for their own art.
- Only members of your server can log in.
- New art appears within about a minute of being posted. The page refreshes itself every 2 minutes.
- The first visit after a week ends (or the daily job, which Vercel's free plan runs once a day) locks in that week's top 3.
  Weeks that ended before you first deployed are skipped.
- Past winners' images are looked up from the original Discord messages, so deleting a winning post removes it from the site.
