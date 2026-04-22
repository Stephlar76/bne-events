// pages/api/events.js — BNE Events API
// Confirmed working sources:
// 1. Ticketmaster Discovery API (free key)
// 2. Brisbane City Council Open Data — multiple datasets (free, no key)
//    - brisbane-city-council-events (master: creative, parks, libraries, active & healthy, botanic gardens)
//    - brisbane-powerhouse-events (separate feed)
//    - business-events (networking, seminars, professional events)
//    - classes-and-workshops-events (skills, crafts, workshops)
//    - city-hall-events (City Hall specific events)

const CAT_KEYWORDS = {
  music: ["music","concert","gig","band","live","jazz","folk","metal","indie","dj","electronic","classical","hip hop","festival","acoustic","blues","country","reggae","punk","rock","choir","orchestra","opera","recital"],
  arts: ["art","gallery","exhibition","expo","theatre","theater","dance","film","cinema","craft","paint","sculpture","photography","design","fashion","ballet","performance","visual","creative"],
  food: ["food","drink","wine","beer","cocktail","dining","restaurant","brunch","market","tasting","chef","cooking","coffee","brewery","gin","whiskey","distillery","farmers","culinary"],
  outdoors: ["hike","walk","run","cycle","bike","kayak","nature","park","outdoor","trail","climb","swim","surf","adventure","fitness","yoga","meditation","wellness","bootcamp","beach","parkrun","garden","botanic"],
  comedy: ["comedy","stand-up","standup","improv","laugh","humour","comedian","comic","trivia","quiz"],
  sports: ["sport","football","rugby","cricket","basketball","tennis","golf","soccer","netball","athletics","swimming","boxing","ufc","nrl","afl","volleyball","triathlon","marathon"],
  community: ["meetup","networking","social","community","volunteer","charity","fundraiser","workshop","seminar","talk","lecture","language","board game","trivia","quiz","book club","speed dating","karaoke","escape room","library","storytime","reading","writing","knitting","sewing","craft"],
  nightlife: ["nightclub","club","bar","pub","karaoke","party","rave","dj night","dance night","rooftop","lounge"],
  family: ["family","kids","children","toddler","baby","school holiday","junior","youth","storytime","playground"],
};

function detectCategory(text) {
  const t = (text || "").toLowerCase();
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return cat;
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
      return {
        id: `tm_${e.id}`,
        title: e.name,
        venue: venue?.name || "Brisbane",
        suburb: venue?.city?.name || "Brisbane",
        address: venue ? `${venue.address?.line1 || ""}, ${venue.city?.name || ""}` : "",
        time: e.dates?.start?.localTime ? new Date(`2000-01-01T${e.dates.start.localTime}`).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "",
        price,
        isFree: false,
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
    const where = `start_datetime >= "${date}T00:00:00+10:00" AND start_datetime <= "${date}T23:59:59+10:00"`;
    const url = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${datasetId}/records?limit=100&order_by=start_datetime&where=${encodeURIComponent(where)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`BCC ${datasetId} error:`, res.status);
      return [];
    }
    const data = await res.json();
    const records = data.results || [];
    console.log(`BCC ${datasetId}: ${records.length} records`);
    return records;
  } catch (err) {
    console.error(`BCC ${datasetId} fetch error:`, err.message);
    return [];
  }
}

// ── MAP BCC RECORD TO EVENT OBJECT ────────────────────────────────────────────
function mapBCCRecord(r, datasetId) {
  const title = r.subject || r.event_name || r.title || "Brisbane Event";
  const startDate = r.start_datetime || r.date_start || "";
  const timeMatch = (r.formatteddatetime || "").match(/(\d+(?::\d+)?(?:am|pm))/i);
  const time = timeMatch ? timeMatch[1].toUpperCase() : (startDate ? new Date(startDate).toLocaleTimeString("en-AU", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Brisbane"
  }) : "");
  const costStr = (r.cost || "").toString().toLowerCase().trim();
  const isFree = costStr === "" || costStr === "free" || costStr === "0" || costStr.startsWith("free");
  const catText = `${title} ${(r.event_type || []).join(" ")} ${r.primaryeventtype || ""} ${r.activitytype || ""} ${r.description || ""}`;

  // Extract external booking URL from bookings HTML
  const bookingMatch = (r.bookings || "").match(/href="([^"#][^"]+)"/);
  const externalBookingUrl = bookingMatch ? bookingMatch[1] : null;

  // Build direct BCC event page URL from eventid in web_link
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
    category: detectCategory(catText),
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

// ── FALLBACK (only when real APIs return < 5 events total) ────────────────────
function generateFallback(date) {
  const dow = new Date(date + "T12:00:00").getDay();
  const isWknd = dow === 0 || dow === 6;
  const EVENTS = [
    { cat:"music", venue:"The Triffid", suburb:"Newstead", url:"https://thetriffid.com.au", title:"Live Music — The Triffid", time:"7:30 PM", price:"See website", isFree:false, tags:["live music"] },
    { cat:"music", venue:"Fortitude Music Hall", suburb:"Fortitude Valley", url:"https://fortitudemusichall.com", title:"Live Concert — Fortitude Music Hall", time:"8:00 PM", price:"See website", isFree:false, tags:["concert"] },
    { cat:"nightlife", venue:"Cloudland", suburb:"Fortitude Valley", url:"https://cloudland.com.au", title:"Night Out — Cloudland", time:"9:00 PM", price:"See website", isFree:false, tags:["nightclub"] },
    { cat:"arts", venue:"GOMA", suburb:"South Brisbane", url:"https://www.qagoma.qld.gov.au/whats-on", title:"Current Exhibition — GOMA", time:"10:00 AM", price:"Free", isFree:true, tags:["gallery"] },
    { cat:"comedy", venue:"Sit Down Comedy Club", suburb:"Fortitude Valley", url:"https://sitdowncomedy.com.au", title:"Stand-Up Night", time:"7:30 PM", price:"See website", isFree:false, tags:["comedy"] },
    { cat:"outdoors", venue:"South Bank Parklands", suburb:"South Bank", url:"https://www.brisbane.qld.gov.au/whats-on", title:"Parkrun — South Bank", time:"7:00 AM", price:"Free", isFree:true, tags:["parkrun"] },
    { cat:"sports", venue:"Suncorp Stadium", suburb:"Milton", url:"https://premier.ticketek.com.au", title:"Live Sport — Suncorp Stadium", time:"7:00 PM", price:"See website", isFree:false, tags:["sport"] },
  ];
  return EVENTS
    .filter(() => !isWknd || true)
    .map((e, i) => ({ ...e, id: `fb_${i}`, source: "fallback", isLive: false }));
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

    const fallback = liveEvents.length < 5 ? generateFallback(date) : [];
    const all = dedup([...liveEvents, ...fallback]);

    return res.status(200).json({
      events: all,
      meta: {
        date,
        total: all.length,
        live: liveEvents.length,
        sources: {
          ticketmaster: tmEvents.length,
          brisbanecouncil: bccEvents.length,
          fallback: fallback.length,
        }
      }
    });
  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
}
