// pages/api/events.js — BNE Events API
// Sources: Ticketmaster (live) + Brisbane City Council Open Data (live) + Fallback

const CAT_KEYWORDS = {
  music: ["music","concert","gig","band","live","jazz","folk","metal","indie","dj","electronic","classical","hip hop","festival","acoustic","blues","country","reggae","punk","rock","choir","orchestra","opera","recital"],
  arts: ["art","gallery","exhibition","expo","theatre","theater","dance","film","cinema","craft","paint","sculpture","photography","design","fashion","ballet","performance","visual"],
  food: ["food","drink","wine","beer","cocktail","dining","restaurant","brunch","market","tasting","chef","cooking","coffee","brewery","gin","whiskey","distillery","farmers","culinary"],
  outdoors: ["hike","walk","run","cycle","bike","kayak","nature","park","outdoor","trail","climb","swim","surf","adventure","fitness","yoga","meditation","wellness","bootcamp","beach","parkrun"],
  comedy: ["comedy","stand-up","standup","improv","laugh","humour","comedian","comic"],
  sports: ["sport","football","rugby","cricket","basketball","tennis","golf","soccer","netball","athletics","swimming","boxing","ufc","nrl","afl","volleyball","triathlon","marathon"],
  community: ["meetup","networking","social","community","volunteer","charity","fundraiser","workshop","seminar","talk","lecture","language","board game","trivia","quiz","book club","speed dating","karaoke","escape room","library"],
  nightlife: ["nightclub","club","bar","pub","karaoke","party","rave","dj night","dance night","rooftop","lounge"],
  family: ["family","kids","children","toddler","baby","school holiday","junior","youth","storytime"],
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

// ── BRISBANE CITY COUNCIL OPEN DATA ───────────────────────────────────────────
// Free public API — no key needed. Covers Powerhouse, parks, libraries, community events
async function fetchBrisbaneCityCouncil(date) {
  try {
    // The BCC OpenDataSoft API — v2.1 format
    const url = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/brisbane-city-council-events/records?limit=100&order_by=date_start&refine=date_start:${date.slice(0,7)}&where=date_start%3E%3D%22${date}%22%20AND%20date_start%3C%3D%22${date}T23%3A59%3A59%22`;

    console.log("Fetching BCC:", url);

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    console.log("BCC response status:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("BCC error:", res.status, text.slice(0, 200));
      return [];
    }

    const data = await res.json();
    const records = data.results || [];
    console.log(`BCC returned ${records.length} records`);

    if (records.length === 0) return [];

    return records.map(r => {
      // BCC API wraps fields directly in the result object
      const title = r.event_name || r.title || "Brisbane Event";
      const startDate = r.date_start || r.startdate || "";
      const time = startDate ? new Date(startDate).toLocaleTimeString("en-AU", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Brisbane"
      }) : "";
      const costStr = (r.cost || "").toString().toLowerCase();
      const isFree = costStr.includes("free") || costStr === "0" || costStr === "";
      const catText = `${title} ${r.category || ""} ${r.event_type || ""} ${r.description || ""}`;

      return {
        id: `bcc_${r.id || Math.random().toString(36).slice(2)}`,
        title,
        venue: r.venue_name || r.location_name || "Brisbane",
        suburb: r.suburb || "Brisbane",
        address: [r.street_address, r.suburb].filter(Boolean).join(", "),
        time,
        price: isFree ? "Free" : (r.cost || "See website"),
        isFree,
        category: detectCategory(catText),
        tags: (r.category || "").split(",").map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 3),
        description: (r.description || r.summary || "").replace(/<[^>]*>/g, "").slice(0, 350),
        url: r.url || r.booking_url || "https://www.brisbane.qld.gov.au/whats-on",
        source: "brisbanecouncil",
        isLive: true,
      };
    });
  } catch (err) {
    console.error("BCC fetch error:", err.message);
    return [];
  }
}

// ── FALLBACK (only used when real APIs return < 5 events) ─────────────────────
function generateFallback(date) {
  const dow = new Date(date + "T12:00:00").getDay();
  const isWknd = dow === 0 || dow === 6;
  const EVENTS = [
    { cat:"music", venue:"The Triffid", suburb:"Newstead", url:"https://thetriffid.com.au", title:"Live Music — The Triffid", time:"7:30 PM", price:"$15", isFree:false, tags:["live music"] },
    { cat:"music", venue:"Fortitude Music Hall", suburb:"Fortitude Valley", url:"https://fortitudemusichall.com", title:"Live Concert — Fortitude Music Hall", time:"8:00 PM", price:"$25", isFree:false, tags:["concert"] },
    { cat:"nightlife", venue:"Cloudland", suburb:"Fortitude Valley", url:"https://cloudland.com.au", title:"Night Out — Cloudland", time:"9:00 PM", price:"$20", isFree:false, tags:["nightclub"] },
    { cat:"arts", venue:"GOMA", suburb:"South Brisbane", url:"https://qagoma.qld.gov.au", title:"Current Exhibition — GOMA", time:"10:00 AM", price:"Free", isFree:true, tags:["gallery"] },
    { cat:"comedy", venue:"Sit Down Comedy Club", suburb:"Fortitude Valley", url:"https://sitdowncomedy.com.au", title:"Stand-Up Night", time:"7:30 PM", price:"$25", isFree:false, tags:["comedy"] },
    { cat:"food", venue:"Jan Powers Farmers Market", suburb:"New Farm", url:"https://janpowersfarmersmarkets.com.au", title:"Farmers Markets", time:"6:00 AM", price:"Free entry", isFree:true, tags:["markets"] },
    { cat:"outdoors", venue:"South Bank Parklands", suburb:"South Bank", url:"https://visitsouthbank.com.au", title:"Parkrun — South Bank", time:"7:00 AM", price:"Free", isFree:true, tags:["parkrun"] },
    { cat:"community", venue:"Archive Beer Boutique", suburb:"Fortitude Valley", url:"https://archivebeer.com.au", title:"Trivia Night", time:"7:00 PM", price:"Free", isFree:true, tags:["trivia"] },
    { cat:"family", venue:"Queensland Museum", suburb:"South Brisbane", url:"https://museum.qld.gov.au", title:"Queensland Museum", time:"9:30 AM", price:"Free", isFree:true, tags:["family","kids"] },
    { cat:"sports", venue:"Suncorp Stadium", suburb:"Milton", url:"https://premier.ticketek.com.au", title:"Live Sport — Suncorp Stadium", time:"7:00 PM", price:"From $25", isFree:false, tags:["sport"] },
  ];
  return EVENTS
    .filter(e => isWknd || !["markets"].includes(e.tags[0]))
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

    const tmEvents = tmResult.status === "fulfilled" ? tmResult.value : [];
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
