// pages/api/sync-facebook.js
// Daily cron job: pulls Brisbane events from Apify Facebook Events Scraper
// and stores them in Supabase for use by the main events API.
//
// Runs daily at 3am Brisbane time (5pm UTC previous day) via vercel.json cron.
// Can also be triggered manually: GET /api/sync-facebook?secret=YOUR_CRON_SECRET
//
// Apify dataset fields used:
//   name, utcStartDate, location.name, location.countryCode, url, usersInterested

// ── CATEGORY DETECTION (same keywords as events.js) ──────────────────────────
const CAT_KEYWORDS = {
  music:     /\b(music|concert|gig|band|live|jazz|folk|metal|indie|dj|electronic|classical|hip.?hop|acoustic|blues|country|reggae|punk|rock|choir|opera|recital|emo|soul|r&b|funk)\b/i,
  arts:      /\b(gallery|exhibition|theatre|theater|ballet|comedy festival|burlesque|circus|drag|cabaret|improv)\b/i,
  markets:   /\b(market|markets|bazaar|fair|fete|stall|artisan|pop.?up)\b/i,
  food:      /\b(dining|brunch|tasting|chef|cooking|brewery|distillery|culinary|eat|food truck|hawker|feast|wine|beer|cocktail)\b/i,
  outdoors:  /\b(hike|hiking|bushwalk|kayak|nature|trail|climb|parkrun|yoga|fitness|pilates|zumba|swim)\b/i,
  comedy:    /\b(comedy|stand.?up|comedian|comic|open mic|improv|laugh)\b/i,
  sports:    /\b(football|rugby|cricket|basketball|tennis|golf|soccer|netball|nrl|afl|boxing|triathlon|marathon|race|bout)\b/i,
  nightlife: /\b(nightclub|club night|dj night|dance night|rooftop|party|rave|disco|karaoke|trivia|bingo|pub crawl|boat party|cruise night)\b/i,
  family:    /\b(family|kids|children|toddler|baby|school holiday|junior|youth)\b/i,
  community: /\b(meetup|networking|seminar|workshop|lecture|language|book club|volunteering|fundraiser|expo|conference)\b/i,
};

function detectCategory(text) {
  const t = (text || "").toLowerCase();
  // Check nightlife first for club/party events
  for (const [cat, regex] of Object.entries(CAT_KEYWORDS)) {
    if (regex.test(t)) return cat;
  }
  return "other";
}

// ── FILTER: is this event in Brisbane? ───────────────────────────────────────
function isBrisbane(event) {
  const cc = event["location.countryCode"];
  const loc = (event["location.name"] || "").toLowerCase();
  const name = (event.name || "").toLowerCase();

  // Must be AU or have Brisbane/QLD in location/name
  if (cc === "US" || cc === "CA" || cc === "GB" || cc === "TH") return false;

  if (cc === "AU") return true;

  // No country code — check location text
  const brisbaneTerms = ["brisbane", "qld", "queensland", "fortitude valley",
    "west end", "south bank", "newstead", "new farm", "paddington",
    "kangaroo point", "woolloongabba", "milton", "toowong"];
  return brisbaneTerms.some(t => loc.includes(t) || name.includes(t));
}

// ── PARSE UTC DATE TO BRISBANE LOCAL DATE + TIME ──────────────────────────────
function parseFBDateTime(utcStartDate) {
  if (!utcStartDate) return { date: null, time: "" };
  try {
    const d = new Date(utcStartDate);
    // Convert to Brisbane time (UTC+10)
    const brisDate = new Date(d.getTime() + 10 * 60 * 60 * 1000);
    const date = brisDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const hours = brisDate.getUTCHours();
    const mins = brisDate.getUTCMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const time = mins === 0
      ? `${h12}:00 ${ampm}`
      : `${h12}:${String(mins).padStart(2, "0")} ${ampm}`;
    return { date, time };
  } catch {
    return { date: null, time: "" };
  }
}

// ── GENERATE STABLE ID FROM EVENT URL ─────────────────────────────────────────
function eventId(url) {
  // Extract Facebook event ID from URL: /events/1234567890/
  const match = (url || "").match(/events\/(\d+)/);
  return match ? `fb_${match[1]}` : `fb_${Math.random().toString(36).slice(2)}`;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Security: only allow GET with secret OR Vercel cron header
  const cronSecret = process.env.CRON_SECRET || "bne-cron-secret";
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const hasSecret = req.query.secret === cronSecret;

  if (!isVercelCron && !hasSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apifyToken = process.env.APIFY_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!apifyToken || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Missing env vars: APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY" });
  }

  console.log("Starting Facebook Events sync...");

  try {
    // ── STEP 1: Run Apify Facebook Events Scraper ─────────────────────────────
    // Using apify/facebook-events-scraper (maintained by Apify)
    // Search queries targeting Brisbane nightlife, music and events
    const apifyInput = {
      queries: [
        "nightlife Brisbane Australia",
        "live music Brisbane Australia",
        "DJ night Brisbane",
        "club event Brisbane",
        "bar event Fortitude Valley",
        "gig Brisbane",
        "concert Brisbane",
        "comedy Brisbane",
        "trivia Brisbane",
        "events Brisbane Saturday",
        "events Brisbane Friday",
      ],
      maxEvents: 150,
    };

    console.log("Triggering Apify run...");
    const runRes = await fetch(
      "https://api.apify.com/v2/acts/apify~facebook-events-scraper/run-sync-get-dataset-items?token=" + apifyToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
        signal: AbortSignal.timeout(280000), // 280s timeout (Vercel max is 300s)
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      console.error("Apify error:", err);
      return res.status(500).json({ error: "Apify run failed", detail: err });
    }

    const rawEvents = await runRes.json();
    console.log(`Apify returned ${rawEvents.length} raw events`);

    // ── STEP 2: Filter, parse and transform ───────────────────────────────────
    const brisbaneEvents = rawEvents
      .filter(isBrisbane)
      .map(e => {
        const { date, time } = parseFBDateTime(e.utcStartDate);
        const category = detectCategory(`${e.name} ${e["location.name"] || ""}`);
        const isEvening = time ? parseInt(time) >= 6 && time.includes("PM") : false;
        const isFree = /\bfree\b/i.test(e.name || "");

        return {
          id: eventId(e.url),
          title: e.name || "Brisbane Event",
          venue: e["location.name"] || "Brisbane",
          address: e["location.name"] || "",
          date,
          time,
          category,
          is_free: isFree,
          is_evening: isEvening,
          url: e.url || "",
          users_interested: e.usersInterested || 0,
          organized_by: e.organizedBy || "",
        };
      })
      .filter(e => e.date !== null); // Skip events with no parseable date

    console.log(`${brisbaneEvents.length} Brisbane events after filtering`);

    // ── STEP 3: Upsert to Supabase ────────────────────────────────────────────
    // Upsert = insert new, update existing (by id primary key)
    // This means re-running won't create duplicates
    const upsertRes = await fetch(
      `${supabaseUrl}/rest/v1/facebook_events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "resolution=merge-duplicates", // upsert behaviour
        },
        body: JSON.stringify(brisbaneEvents),
      }
    );

    if (!upsertRes.ok) {
      const err = await upsertRes.text();
      console.error("Supabase upsert error:", err);
      return res.status(500).json({ error: "Supabase upsert failed", detail: err });
    }

    // ── STEP 4: Delete stale events (past events older than 2 days) ───────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    await fetch(
      `${supabaseUrl}/rest/v1/facebook_events?date=lt.${cutoffStr}`,
      {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    console.log(`Sync complete: ${brisbaneEvents.length} events upserted`);

    return res.status(200).json({
      success: true,
      total_raw: rawEvents.length,
      brisbane_filtered: brisbaneEvents.length,
      message: `Synced ${brisbaneEvents.length} Brisbane Facebook events to Supabase`,
    });

  } catch (err) {
    console.error("Sync error:", err.message);
    return res.status(500).json({ error: "Sync failed", detail: err.message });
  }
}
