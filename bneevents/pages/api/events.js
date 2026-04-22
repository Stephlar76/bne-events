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

  // ── FOOD ──
  "food":                               "food",
  "markets":                            "food",

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
function bccCategory(eventTypes, primaryType) {
  const types = [...(eventTypes || []), primaryType || ""]
    .map(t => (t || "").toLowerCase().trim())
    .filter(t => t && !BCC_IGNORE.has(t));
  for (const t of types) {
    if (BCC_CAT_MAP[t]) return BCC_CAT_MAP[t];
  }
  return null; // No BCC match — caller falls back to keyword detection
}

// Strict keyword detection — only used when BCC types give no match
// Uses whole-word matching to avoid "fitness" matching "unfit"
const CAT_KEYWORDS = {
  music:     /\b(music|concert|gig|band|live act|jazz|folk|metal|indie|dj set|electronic|classical|hip.?hop|festival|acoustic|blues|country|reggae|punk|rock|choir|orchestra|opera|recital)\b/i,
  arts:      /\b(gallery|exhibition|expo|theatre|theater|ballet|sculpture|photography|visual art|mural|installation)\b/i,
  food:      /\b(food|wine|beer|cocktail|dining|brunch|tasting|chef|cooking class|brewery|distillery|farmers market|culinary)\b/i,
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
  // formatteddatetime looks like "Thursday, 23 April 2026, 10am - 2:30pm"
  // or "Saturday, 25 April 2026, 7:30pm"
  // Extract the START time only
  const fmt = r.formatteddatetime || "";
  const timeMatch = fmt.match(/,\s*(\d+(?::\d+)?(?:am|pm))/i);
  if (timeMatch) return timeMatch[1].toUpperCase();

  // Fallback: parse start_datetime as UTC and convert to Brisbane time
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
  // All confirmed working BCC datasets on the same API
  const DATASETS = [
    "brisbane-city-council-events",    // Master: creative, parks, libraries, active & healthy, botanic gardens
    "brisbane-powerhouse-events",      // Brisbane Powerhouse theatre & arts
    "business-events",                 // Networking, seminars, professional events
    "classes-and-workshops-events",    // Skills, crafts, workshops
    "city-hall-events",                // City Hall events
  ];

  const results = await Promise.allSettled(
    DATASETS.map(ds => fetchBCCDataset(ds, date))
  );

  const allRecords = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      r.value.forEach(record => {
        allRecords.push(mapBCCRecord(record, DATASETS[i]));
      });
    }
  });

  // Deduplicate across datasets by event title + time
  const seen = new Set();
  return allRecords.filter(e => {
    const key = (e.title + e.time).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── PERMANENT VENUES (shown when real data is sparse) ────────────────────────
// These are real Brisbane venues that ALWAYS have events — we link to their
// events pages directly. No fake events, just real venue discovery.
function getPermanentVenues() {
  return [
    // MUSIC
    { id:"pv_1", cat:"music", title:"What's On — The Triffid", venue:"The Triffid", suburb:"Newstead", time:"", price:"Various", isFree:false, tags:["live music","indie"], url:"https://thetriffid.com.au/whats-on/", source:"fallback", isLive:false, description:"Brisbane's home for live music in a converted WW2 hangar. Check their events page for upcoming gigs." },
    { id:"pv_2", cat:"music", title:"What's On — Fortitude Music Hall", venue:"Fortitude Music Hall", suburb:"Fortitude Valley", time:"", price:"Various", isFree:false, tags:["live music","concert"], url:"https://fortitudemusichall.com/whats-on/", source:"fallback", isLive:false, description:"Brisbane's grandest live music venue. Check their calendar for upcoming concerts." },
    { id:"pv_3", cat:"music", title:"What's On — The Zoo", venue:"The Zoo", suburb:"Fortitude Valley", time:"", price:"Various", isFree:false, tags:["live music","indie"], url:"https://thezoo.com.au/whats-on/", source:"fallback", isLive:false, description:"Iconic Brisbane live music pub. Always something happening — check their full calendar." },
    { id:"pv_4", cat:"music", title:"What's On — The Tivoli", venue:"The Tivoli", suburb:"Fortitude Valley", time:"", price:"Various", isFree:false, tags:["live music","concert"], url:"https://thetivoli.com.au/events/", source:"fallback", isLive:false, description:"One of Brisbane's most loved live music venues. See the full upcoming event schedule." },
    // ARTS
    { id:"pv_5", cat:"arts", title:"What's On — Brisbane Powerhouse", venue:"Brisbane Powerhouse", suburb:"New Farm", time:"", price:"Various", isFree:false, tags:["theatre","arts","comedy"], url:"https://brisbanepowerhouse.org/events/", source:"fallback", isLive:false, description:"Queensland's home for contemporary culture. Theatre, comedy, music, festivals and more." },
    { id:"pv_6", cat:"arts", title:"What's On — QPAC", venue:"QPAC", suburb:"South Brisbane", time:"", price:"Various", isFree:false, tags:["theatre","dance","opera"], url:"https://qpac.com.au/whats-on", source:"fallback", isLive:false, description:"Queensland's premier performing arts centre. Opera, ballet, theatre and major productions." },
    { id:"pv_7", cat:"arts", title:"What's On — GOMA", venue:"Gallery of Modern Art", suburb:"South Brisbane", time:"10:00 AM", price:"Free", isFree:true, tags:["gallery","exhibition","free"], url:"https://www.qagoma.qld.gov.au/whats-on", source:"fallback", isLive:false, description:"World-class art gallery. Free entry to the permanent collection. Special exhibitions vary." },
    // COMEDY
    { id:"pv_8", cat:"comedy", title:"What's On — Sit Down Comedy Club", venue:"Sit Down Comedy Club", suburb:"Fortitude Valley", time:"7:30 PM", price:"Various", isFree:false, tags:["comedy","stand-up"], url:"https://sitdowncomedy.com.au", source:"fallback", isLive:false, description:"Brisbane's dedicated comedy club. Weekly shows from local and touring comedians." },
    // NIGHTLIFE
    { id:"pv_9", cat:"nightlife", title:"What's On — Cloudland", venue:"Cloudland", suburb:"Fortitude Valley", time:"9:00 PM", price:"Various", isFree:false, tags:["nightclub","dancing"], url:"https://cloudland.com.au/events/", source:"fallback", isLive:false, description:"Brisbane's most iconic nightclub. Multiple rooms, rooftop, world-class DJs. Check their events." },
    { id:"pv_10", cat:"nightlife", title:"What's On — The Wickham", venue:"The Wickham Hotel", suburb:"Fortitude Valley", time:"", price:"Various", isFree:false, tags:["lgbtq+","bar","nightlife"], url:"https://thewickham.com.au/whats-on/", source:"fallback", isLive:false, description:"Brisbane's iconic LGBTQ+ venue. Drag shows, DJ nights, rooftop bar events." },
    // FOOD
    { id:"pv_11", cat:"food", title:"West End Markets — Every Saturday", venue:"Davies Park", suburb:"West End", time:"6:00 AM", price:"Free entry", isFree:true, tags:["markets","food","weekly"], url:"https://westendmarket.com.au", source:"fallback", isLive:false, description:"Every Saturday 6am–2pm. 150+ vendors, fresh produce, street food, live music. Free entry." },
    { id:"pv_12", cat:"food", title:"Jan Powers Farmers Markets — Powerhouse", venue:"Brisbane Powerhouse", suburb:"New Farm", time:"6:00 AM", price:"Free entry", isFree:true, tags:["markets","farmers","weekly"], url:"https://janpowersfarmersmarkets.com.au", source:"fallback", isLive:false, description:"Every Saturday morning. Brisbane's best farmers market with artisan produce and food stalls." },
    // OUTDOORS
    { id:"pv_13", cat:"outdoors", title:"Parkrun — Every Saturday 7am", venue:"South Bank Parklands", suburb:"South Bank", time:"7:00 AM", price:"Free", isFree:true, tags:["running","parkrun","free"], url:"https://www.parkrun.com.au/brisbane/", source:"fallback", isLive:false, description:"Free 5km timed run every Saturday at 7am. All paces welcome. Register free at parkrun.com.au." },
    // COMMUNITY
    { id:"pv_14", cat:"community", title:"What's On — River City Labs", venue:"River City Labs", suburb:"Fortitude Valley", time:"", price:"Various", isFree:false, tags:["tech","networking","startup"], url:"https://rivercitylabs.net/events/", source:"fallback", isLive:false, description:"Brisbane's leading startup hub. Tech meetups, networking events, workshops and more." },
    { id:"pv_15", cat:"community", title:"Brisbane Meetup Events", venue:"Various Brisbane Venues", suburb:"Brisbane", time:"", price:"Various", isFree:true, tags:["meetup","social","community"], url:"https://www.meetup.com/find/au--brisbane/", source:"fallback", isLive:false, description:"Hundreds of Brisbane Meetup groups — hiking, language exchange, board games, tech, trivia and more." },
  ];
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
