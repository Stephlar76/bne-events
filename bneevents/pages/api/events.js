// pages/api/events.js — BNE Events API
// Confirmed working sources:
// 1. Ticketmaster Discovery API (free key)
// 2. Brisbane City Council Open Data — multiple datasets (free, no key)
//    - brisbane-city-council-events (master: creative, parks, libraries, active & healthy, botanic gardens)
//    - brisbane-powerhouse-events (separate feed)
//    - business-events (networking, seminars, professional events)
//    - classes-and-workshops-events (skills, crafts, workshops)
//    - city-hall-events (City Hall specific events)

// ── BCC OFFICIAL CATEGORY MAP ─────────────────────────────────────────────────
// Complete mapping of ALL 18 BCC event_type values (from API facets)
// Each value mapped to our app category — no guessing, no gaps
const BCC_CAT_MAP = {
  // ── MUSIC ──
  "music":                              "music",
  "performing arts":                    "music",

  // ── ARTS ──
  "art":                                "arts",
  "creative":                           "arts",
  "exhibitions":                        "arts",
  "culture":                            "arts",
  "aboriginal and torres strait islander": "arts",  // cultural performances & exhibitions

  // ── COMEDY ──
  "comedy":                             "comedy",

  // ── FOOD (pure — restaurants, bars, food festivals only) ──
  "food":                               "food",

  // ── MARKETS (separate category — craft, farmers, art, Christmas markets) ──
  "markets":                            "markets",

  // ── OUTDOORS ──
  // "Fitness & well-being" = active physical events (yoga, zumba, dance fitness, swimming)
  "fitness & well-being":               "outdoors",
  "fitness and well-being":             "outdoors",
  // "Green" = nature, environment, gardening, conservation
  "green":                              "outdoors",

  // ── SPORTS ──
  "sport":                              "sports",
  "sports":                             "sports",

  // ── FAMILY ──
  "family events":                      "family",
  "family":                             "family",
  "children":                           "family",

  // ── COMMUNITY ──
  // Tours = guided heritage tours, city walks, museum tours
  "tours":                              "community",
  "workshops":                          "community",
  "business":                           "community",
  "festivals":                          "arts",    // festivals lean arts/culture

  // ── IGNORE — not real categories ──
  // "Free" = pricing info, not a category → skip
  // "Featured" = editorial tag, not a category → skip
};

// Non-category BCC tags — pricing/editorial info, not real categories
const BCC_IGNORE = new Set(["free", "featured"]);

// Maps BCC event_type array to our app category — uses official BCC values
// Markets takes priority over Food since an event can have both tags
const PRIORITY_ORDER = ["markets", "music", "arts", "comedy", "sports", "family", "nightlife", "outdoors", "community", "food"];

function bccCategory(eventTypes, primaryType) {
  const types = [...(eventTypes || []), primaryType || ""]
    .map(t => (t || "").toLowerCase().trim())
    .filter(t => t && !BCC_IGNORE.has(t));

  // Get all matched categories
  const matched = types.map(t => BCC_CAT_MAP[t]).filter(Boolean);
  if (matched.length === 0) return null;

  // Return highest priority match
  for (const cat of PRIORITY_ORDER) {
    if (matched.includes(cat)) return cat;
  }
  return matched[0];
}

// Strict keyword detection — only used when BCC types give no match
// Uses whole-word matching to avoid "fitness" matching "unfit"
const CAT_KEYWORDS = {
  music:     /\b(music|concert|gig|band|live act|jazz|folk|metal|indie|dj set|electronic|classical|hip.?hop|festival|acoustic|blues|country|reggae|punk|rock|choir|orchestra|opera|recital)\b/i,
  arts:      /\b(gallery|exhibition|expo|theatre|theater|ballet|sculpture|photography|visual art|mural|installation)\b/i,
  markets:   /\b(market|markets|bazaar|fair|fete|stall|stallholder|craft fair|artisan fair|night market|sunday market|saturday market|farmers market|pop.?up market)\b/i,
  food:      /\b(restaurant|bar|pub|wine|beer|cocktail|dining|brunch|tasting|chef|cooking class|brewery|distillery|culinary|eat street|food truck|food festival)\b/i,
  outdoors:  /\b(hike|hiking|bushwalk|kayak|nature walk|trail|rock climb|parkrun|botanical|gardening)\b/i,
  comedy:    /\b(comedy|stand.?up|improv|comedian|comic)\b/i,
  sports:    /\b(football|rugby|cricket|basketball|tennis|golf|soccer|netball|athletics|swimming|boxing|nrl|afl|volleyball|triathlon|marathon)\b/i,
  community: /\b(meetup|networking|seminar|workshop|lecture|language exchange|book club|karaoke|storytime|reading group|writing group|volunteering|fundraiser)\b/i,
  nightlife: /\b(nightclub|dj night|dance night|rooftop bar|pub crawl)\b/i,
  family:    /\b(family|kids|children|toddler|baby|school holiday|junior|youth|storytime)\b/i,
};

function detectCategory(text) {
  const t = text || "";
  for (const [cat, regex] of Object.entries(CAT_KEYWORDS)) {
    if (regex.test(t)) return cat;
  }
  return "other";
}

// ── TICKETMASTER ──────────────────────────────────────────────────────────────
async function fetchTicketmaster(date) {
  const key = process.env.TICKETMASTER_KEY;
  if (!key || key === "your_key_here") return [];
  try {
    const params = new URLSearchParams({
      apikey: key,
      city: "Brisbane",
      countryCode: "AU",
      startDateTime: `${date}T00:00:00Z`,
      endDateTime: `${date}T23:59:59Z`,
      size: "50",
      sort: "date,asc",
    });
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data._embedded?.events || [];
    return items.map(e => {
      const venue = e._embedded?.venues?.[0];
      const priceRange = e.priceRanges?.[0];
      const price = priceRange ? `$${Math.round(priceRange.min)}–$${Math.round(priceRange.max)}` : "Ticketed";
      const catText = `${e.name} ${e.classifications?.[0]?.segment?.name || ""} ${e.classifications?.[0]?.genre?.name || ""}`;
      const timeStr = e.dates?.start?.localTime ? new Date(`2000-01-01T${e.dates.start.localTime}`).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
      return {
        id: `tm_${e.id}`,
        title: e.name,
        venue: venue?.name || "Brisbane",
        suburb: venue?.city?.name || "Brisbane",
        address: venue ? `${venue.address?.line1 || ""}, ${venue.city?.name || ""}` : "",
        time: timeStr,
        price,
        isFree: false,
        isEvening: isEveningTime(timeStr),
        category: detectCategory(catText),
        tags: [e.classifications?.[0]?.segment?.name, e.classifications?.[0]?.genre?.name].filter(Boolean).map(t => t.toLowerCase()),
        description: e.info || e.pleaseNote || "",
        url: e.url || "https://ticketmaster.com.au",
        source: "ticketmaster",
        isLive: true,
      };
    });
  } catch (err) {
    console.error("Ticketmaster error:", err.message);
    return [];
  }
}

// ── BCC DATASET FETCHER (reusable for all BCC datasets) ───────────────────────
async function fetchBCCDataset(datasetId, date) {
  try {
    // BCC stores datetimes in UTC. Brisbane is UTC+10 (no daylight saving).
    // "2026-04-24" Brisbane = 2026-04-23T14:00:00Z to 2026-04-24T13:59:59Z
    const [year, month, day] = date.split("-").map(Number);
    const startBrisbane = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)); // midnight Brisbane
    const startUTC = new Date(startBrisbane.getTime() - 10 * 60 * 60 * 1000); // subtract 10hrs → UTC
    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1000); // +24hrs -1s

    const fmt = d => d.toISOString().replace(".000Z", "Z");
    const where = `start_datetime >= "${fmt(startUTC)}" AND start_datetime <= "${fmt(endUTC)}"`;
    const url = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${datasetId}/records?limit=100&order_by=start_datetime&where=${encodeURIComponent(where)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`BCC ${datasetId} error:`, res.status);
      return [];
    }
    const data = await res.json();
    const records = data.results || [];
    console.log(`BCC ${datasetId}: ${records.length} records for ${date} (UTC: ${fmt(startUTC)} to ${fmt(endUTC)})`);
    return records;
  } catch (err) {
    console.error(`BCC ${datasetId} fetch error:`, err.message);
    return [];
  }
}

// ── MAP BCC RECORD TO EVENT OBJECT ────────────────────────────────────────────
// Returns true if a time string represents 6pm or later
function isEveningTime(timeStr) {
  if (!timeStr) return false;
  const t = timeStr.toLowerCase().trim();
  if (!t.includes("pm")) return false;
  const hour = parseInt(t);
  if (isNaN(hour)) return false;
  return hour >= 6 && hour <= 11; // 6pm–11pm only
}
function parseBCCTime(r) {
  // formatteddatetime examples:
  // "Thursday, 23 April 2026, 10am - 2:30pm"     ← start has am/pm ✅
  // "Saturday, 25 April 2026, 7:30pm"             ← single time ✅
  // "Friday, 24 April 2026, 9:30 - 10:30am"      ← start has NO am/pm, use UTC fallback
  const fmt = r.formatteddatetime || "";

  if (fmt) {
    const timePart = fmt.split(",").pop().trim();
    // Only use formatteddatetime if the FIRST time token has am/pm
    // e.g. "10am - 2:30pm" → first token "10am" has am/pm ✅
    // e.g. "9:30 - 10:30am" → first token "9:30" has no am/pm → skip, use UTC
    const firstTime = timePart.match(/^(\d+(?::\d+)?)\s*(am|pm)?/i);
    if (firstTime && firstTime[2]) {
      // Start time has am/pm — reliable, use it
      return (firstTime[1] + firstTime[2]).toUpperCase();
    }
    // Start time has no am/pm — fall through to UTC parse
  }

  // UTC fallback — always correct since BCC stores in UTC and Brisbane = UTC+10
  const startDate = r.start_datetime || "";
  if (!startDate) return "";
  try {
    return new Date(startDate).toLocaleTimeString("en-AU", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Brisbane"
    });
  } catch { return ""; }
}
function mapBCCRecord(r, datasetId) {
  const title = r.subject || r.event_name || r.title || "Brisbane Event";
  const time = parseBCCTime(r);
  const costStr = (r.cost || "").toString().toLowerCase().trim();
  const isFree = costStr === "" || costStr === "free" || costStr === "0" || costStr.startsWith("free");
  const catText = `${title} ${(r.event_type || []).join(" ")} ${r.primaryeventtype || ""} ${r.activitytype || ""} ${r.description || ""}`;
  const category = bccCategory(r.event_type, r.primaryeventtype) || detectCategory(catText);
  const isEvening = isEveningTime(time);

  // Extract external booking URL from bookings HTML
  const bookingMatch = (r.bookings || "").match(/href="([^"#][^"]+)"/);
  const externalBookingUrl = bookingMatch ? bookingMatch[1] : null;

  // Build direct BCC event page URL
  const eventIdMatch = (r.web_link || "").match(/eventid(?:%3[Dd]|=)(\d+)/i);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const bccEventPage = eventId
    ? `https://www.brisbane.qld.gov.au/events/${slug}/${eventId}`
    : "https://www.brisbane.qld.gov.au/whats-on";

  const eventUrl = (!isFree && externalBookingUrl) ? externalBookingUrl : bccEventPage;

  return {
    id: `bcc_${datasetId}_${eventId || Math.random().toString(36).slice(2)}`,
    title,
    venue: r.location || r.venue_name || r.venuename || "Brisbane",
    suburb: r.suburb || "Brisbane",
    address: r.location || r.venueaddress || "",
    time,
    price: isFree ? "Free" : (r.cost || "See website"),
    isFree,
    category,
    // isEvening flag lets the frontend show this under nightlife filter too
    isEvening,
    tags: (r.event_type || r.libraryeventtypes || []).map(t => t.toLowerCase()).slice(0, 3),
    description: (r.description || "").replace(/<[^>]*>/g, "").slice(0, 350),
    url: eventUrl,
    image: r.eventimage || null,
    source: "brisbanecouncil",
    isLive: true,
  };
}

// ── ALL BCC SOURCES ───────────────────────────────────────────────────────────
async function fetchBrisbaneCityCouncil(date) {
  // The master dataset already includes ALL sub-categories:
  // creative, parks, libraries, active & healthy, botanic gardens, powerhouse,
  // business events, workshops, city hall — everything in one call.
  // Using sub-datasets in parallel was causing Vercel timeout on free tier.
  const records = await fetchBCCDataset("brisbane-city-council-events", date);
  return records.map(r => mapBCCRecord(r, "brisbane-city-council-events"));
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter(e => {
    const k = (e.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date" });

  try {
    const [tmResult, bccResult] = await Promise.allSettled([
      fetchTicketmaster(date),
      fetchBrisbaneCityCouncil(date),
    ]);

    const tmEvents  = tmResult.status  === "fulfilled" ? tmResult.value  : [];
    const bccEvents = bccResult.status === "fulfilled" ? bccResult.value : [];
    const liveEvents = [...tmEvents, ...bccEvents];

    console.log(`Total: TM=${tmEvents.length} BCC=${bccEvents.length} Live=${liveEvents.length}`);

    const fallback = liveEvents.length < 5 ? [] : [];
    const all = dedup([...liveEvents]);

    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({
      events: all,
      meta: {
        date,
        total: all.length,
        live: liveEvents.length,
        sources: {
          ticketmaster: tmEvents.length,
          brisbanecouncil: bccEvents.length,
          fallback: 0,
        }
      }
    });
  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
}
