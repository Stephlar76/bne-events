# BNE Events 🗺️
> Every event happening in Brisbane — live from Eventbrite, Ticketmaster, and a curated local venue guide.

## Deploy to Vercel (15 minutes)

### Step 1 — Push to GitHub
1. Go to github.com and click **"New repository"**
2. Name it `bne-events`, set to **Public**, click **Create repository**
3. On the next page, click **"uploading an existing file"**
4. Upload ALL the files from this folder (keeping the folder structure)
5. Click **Commit changes**

### Step 2 — Deploy on Vercel
1. Go to vercel.com and click **"Add New Project"**
2. Click **"Import"** next to your `bne-events` GitHub repo
3. Click **"Deploy"** — Vercel auto-detects Next.js
4. Wait ~2 minutes for build to complete
5. You'll get a URL like `bne-events.vercel.app` ✅

### Step 3 — Add API Keys (for live events)
1. In Vercel dashboard, go to your project → **Settings → Environment Variables**
2. Add these two variables:

| Name | Value |
|------|-------|
| `EVENTBRITE_TOKEN` | Your Eventbrite private token |
| `TICKETMASTER_KEY` | Your Ticketmaster API key |

3. Go to **Deployments** → click **Redeploy** to apply the keys
4. Done — real live events will now appear!

### Get your Ticketmaster API key (free, 2 minutes)
1. Go to **developer.ticketmaster.com**
2. Click **"Get your API key"**
3. Sign up for free
4. Copy your **Consumer Key**

## What it does
- Fetches real Brisbane events from **Eventbrite** (concerts, comedy, markets, community)
- Fetches major events from **Ticketmaster** (big concerts, sports, stadium shows)  
- Fills coverage gaps with a curated **local venue guide** for venues not on those platforms
- Community **Submit Event** feature — anyone can add events not listed elsewhere
- Filter by category: Music, Nightlife, Arts, Comedy, Food, Community, Outdoors, Sports, Family
- Filter to **Free events** only
- Mobile-first dark design

## Tech stack
- **Next.js 14** — React framework
- **Vercel** — hosting (free tier is plenty)
- API keys stored server-side — never exposed to browser
