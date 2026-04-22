// pages/api/events.js
// Server-side API route — keys are safe here, never exposed to browser

const BRISBANE_SUBURBS = [
  "Brisbane", "Fortitude Valley", "South Brisbane", "West End", "New Farm",
  "Newstead", "Teneriffe", "Milton", "Paddington", "Red Hill", "Spring Hill",
  "Bowen Hills", "Herston", "Kelvin Grove", "Woolloongabba", "Kangaroo Point",
  "East Brisbane", "Hawthorne", "Bulimba", "Balmoral", "Hamilton", "Ascot",
  "Clayfield", "Hendra", "Albion", "Lutwyche", "Windsor", "Wilston",
  "Toowong", "Auchenflower", "St Lucia", "Indooroopilly", "Taringa",
  "Sunnybank", "Sunnybank Hills", "Acacia Ridge", "Carindale", "Coorparoo",
  "Camp Hill", "Holland Park", "Mount Gravatt", "Annerley", "Moorooka",
  "Rocklea", "Oxley", "Darra", "Inala", "Forest Lake", "Springfield",
  "Boondall", "Chermside", "Aspley", "Stafford", "Everton Park",
  "Mitchelton", "Keperra", "The Gap", "Ferny Grove", "Samford",
  "Manly", "Wynnum", "Lota", "Capalaba", "Cleveland", "Redland Bay"
];

// Category detection
const CAT_KEYWORDS = {
  music: ["music","concert","gig","band","live","jazz","folk","metal","indie","dj","electronic","classical","hip hop","festival","acoustic","blues","country","reggae","punk","rock","choir","orchestra","opera"],
  arts: ["art","gallery","exhibition","expo","theatre","theater","dance","film","cinema","craft","paint","sculpture","photography","design","fashion","ballet","performance"],
  food: ["food","drink","wine","beer","cocktail","dining","restaurant","brunch","market","tasting","chef","cooking","coffee","brewery","gin","whiskey","distillery","farmers","culinary"],
  outdoors: ["hike","walk","run","cycle","bike","kayak","nature","park","outdoor","trail","climb","swim","surf","adventure","fitness","yoga","meditation","wellness","bootcamp","beach","parkrun"],
  comedy: ["comedy","stand-up","standup","improv","laugh","humour","comedian","comic"],
  sports: ["sport","football","rugby","cricket","basketball","tennis","golf","soccer","netball","athletics","swimming","boxing","ufc","nrl","afl","volleyball","triathlon","marathon"],
  community: ["meetup","networking","social","community","volunteer","charity","fundraiser","workshop","seminar","talk","lecture","language","board game","trivia","quiz","book club","speed dating","karaoke","escape room"],
  nightlife: ["nightclub","club","bar","pub","karaoke","party","rave","dj night","dance night","rooftop","lounge"],
  family: ["family","kids","children","toddler","baby","school holiday","junior","youth"],
};

function detectCategory(text) {
  const t = (text || "").toLowerCase();
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return cat;
  }
  return "other";
}

function isBrisbane(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return BRISBANE_SUBURBS.some(s => t.includes(s.toLowerCase())) || t.includes("qld") || t.includes("queensland");
}

// ── EVENTBRITE ────────────────────────────────────────────────────────────────
async function fetchEventbrite(date) {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token || token === "your_private_token_here") return [];

  try {
    const start = `${date}T00:00:00`;
    const end   = `${date}T23:59:59`;

    const params = new URLSearchParams({
      "location.address": "Brisbane, Queensland, Australia",
      "location.within": "40km",
      "start_date.range_start": start,
      "start_date.range_end": end,
      "expand": "venue,ticket_availability,category",
      "page_size": "50",
    });

    const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      console.error("Eventbrite error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (!data.events) return [];

    return data.events
      .filter(e => {
        // Filter to Brisbane only
        const addr = e.venue?.address?.localized_address_display || "";
        const city = e.venue?.address?.city || "";
        return isBrisbane(addr) || isBrisbane(city) || !e.venue;
      })
      .map(e => {
        const isFree = e.is_free || false;
        const minPrice = e.ticket_availability?.minimum_ticket_price?.display;
        const maxPrice = e.ticket_availability?.maximum_ticket_price?.display;
        const price = isFree ? "Free" : (minPrice && maxPrice && minPrice !== maxPrice ? `${minPrice}–${maxPrice}` : minPrice || "Ticketed");
        const catText = `${e.name?.text || ""} ${e.description?.text || ""} ${e.category?.name || ""}`;

        return {
          id: `eb_${e.id}`,
          title: e.name?.text || "Untitled Event",
          venue: e.venue?.name || "Brisbane",
          suburb: e.venue?.address?.city || e.venue?.address?.localized_area_display || "Brisbane",
          address: e.venue?.address?.localized_address_display || "",
          time: e.start?.local ? new Date(e.start.local).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }) : "",
          price,
          isFree,
          category: detectCategory(catText),
          tags: [e.category?.name, e.subcategory?.name, e.format?.name].filter(Boolean).map(t => t.toLowerCase()),
          description: (e.summary || e.description?.text || "").slice(0, 350),
          url: e.url || "https://eventbrite.com.au",
          image: e.logo?.url || null,
          source: "eventbrite",
          isLive: true,
        };
      });
  } catch (err) {
    console.error("Eventbrite fetch error:", err);
    return [];
  }
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

    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
      next: { revalidate: 300 },
    });

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
        image: e.images?.[0]?.url || null,
        source: "ticketmaster",
        isLive: true,
      };
    });
  } catch (err) {
    console.error("Ticketmaster fetch error:", err);
    return [];
  }
}

// ── FALLBACK DATABASE ─────────────────────────────────────────────────────────
function generateFallback(date) {
  const dow = new Date(date + "T12:00:00").getDay();
  const isWknd = dow === 0 || dow === 6;
  const isFri = dow === 5;

  function sr(i) {
    const s = parseInt(date.replace(/-/g, "")) + i * 997;
    const x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
  }

  const events = [];
  let id = 9000;

  const VENUE_TEMPLATES = [
    // MUSIC
    { cat:"music", venue:"The Triffid", suburb:"Newstead", url:"https://thetriffid.com.au", title:"Live Music Night — The Triffid", time:"7:30 PM", price:"$15", isFree:false, tags:["live music","local"], desc:"Local and touring acts at one of Brisbane's best live music venues. Support acts from 7 PM." },
    { cat:"music", venue:"Fortitude Music Hall", suburb:"Fortitude Valley", url:"https://fortitudemusichall.com", title:"Live Concert — Fortitude Music Hall", time:"8:00 PM", price:"$25", isFree:false, tags:["live music","concert"], desc:"A spectacular concert experience at Brisbane's grandest music venue." },
    { cat:"music", venue:"The Zoo", suburb:"Fortitude Valley", url:"https://eventbrite.com.au/d/australia--brisbane/music/", title:"Open Mic Night — The Zoo", time:"7:00 PM", price:"Free", isFree:true, tags:["open mic","local"], desc:"All musicians welcome. Sign up from 6:30 PM at The Zoo." },
    { cat:"music", venue:"Woolly Mammoth Saloon", suburb:"Fortitude Valley", url:"https://woollymammoth.com.au", title:"DJ Night — Woolly Mammoth", time:"9:00 PM", price:"$10", isFree:false, tags:["dj","electronic"], desc:"Resident DJs spin house, electronic and dance at Woolly Mammoth." },
    { cat:"music", venue:"Black Bear Lodge", suburb:"Fortitude Valley", url:"https://blackbearlodge.com.au", title:"Acoustic Sessions — Black Bear Lodge", time:"6:30 PM", price:"Free", isFree:true, tags:["acoustic","chill"], desc:"Intimate acoustic sets in the cosy surroundings of Black Bear Lodge." },
    { cat:"music", venue:"The Brightside", suburb:"Fortitude Valley", url:"https://thebrightside.com.au", title:"Rock Night — The Brightside", time:"8:00 PM", price:"$18", isFree:false, tags:["rock","indie"], desc:"Local rock and indie bands take the stage at The Brightside." },
    // NIGHTLIFE
    { cat:"nightlife", venue:"Cloudland", suburb:"Fortitude Valley", url:"https://cloudland.com.au", title:"Saturday Night — Cloudland", time:"9:00 PM", price:"$20", isFree:false, tags:["nightclub","dancing"], desc:"Brisbane's most iconic nightclub. Multiple rooms, rooftop terrace, world-class DJs." },
    { cat:"nightlife", venue:"Family Nightclub", suburb:"Fortitude Valley", url:"https://thefamily.com.au", title:"Queer Night — Family", time:"9:00 PM", price:"$15", isFree:false, tags:["lgbtq+","inclusive"], desc:"Brisbane's beloved inclusive queer nightclub. Drag, DJs, and the best crowd in town." },
    { cat:"nightlife", venue:"The Wickham Hotel", suburb:"Fortitude Valley", url:"https://thewickham.com.au", title:"Rooftop Sessions — The Wickham", time:"5:00 PM", price:"Free", isFree:true, tags:["rooftop","drinks"], desc:"Sunset drinks on the rooftop at The Wickham. Walk-ins welcome." },
    { cat:"nightlife", venue:"Howard Smith Wharves", suburb:"Brisbane City", url:"https://howardsmithwharves.com", title:"Sunset Bar — Howard Smith Wharves", time:"4:00 PM", price:"Free", isFree:true, tags:["waterfront","drinks"], desc:"Drinks by the Brisbane River as the sun sets over the Story Bridge." },
    // ARTS
    { cat:"arts", venue:"Gallery of Modern Art (GOMA)", suburb:"South Brisbane", url:"https://qagoma.qld.gov.au", title:"Current Exhibition — GOMA", time:"10:00 AM", price:"Free", isFree:true, tags:["gallery","exhibition"], desc:"World-class contemporary art at GOMA. Free entry to the permanent collection." },
    { cat:"arts", venue:"Brisbane Powerhouse", suburb:"New Farm", url:"https://brisbanepowerhouse.org", title:"Theatre Performance — Brisbane Powerhouse", time:"7:30 PM", price:"$35–$65", isFree:false, tags:["theatre","performance"], desc:"Live theatre at Brisbane's iconic Powerhouse. Book ahead — sells out fast." },
    { cat:"arts", venue:"Metro Arts", suburb:"Brisbane City", url:"https://metroarts.com.au", title:"Artist Talk — Metro Arts", time:"6:00 PM", price:"Free", isFree:true, tags:["art","talk"], desc:"Meet artists and hear about their creative process at Metro Arts." },
    { cat:"arts", venue:"Queensland Museum", suburb:"South Brisbane", url:"https://museum.qld.gov.au", title:"Explore Queensland Museum", time:"9:30 AM", price:"Free", isFree:true, tags:["museum","family","education"], desc:"Discover Queensland's natural and cultural history. Free general admission." },
    // COMEDY
    { cat:"comedy", venue:"Sit Down Comedy Club", suburb:"Fortitude Valley", url:"https://sitdowncomedy.com.au", title:"Stand-Up Comedy Night", time:"7:30 PM", price:"$25", isFree:false, tags:["stand-up","comedy"], desc:"Brisbane's dedicated comedy club delivering laughs every week." },
    { cat:"comedy", venue:"Brisbane Powerhouse", suburb:"New Farm", url:"https://brisbanepowerhouse.org", title:"Comedy Festival Show — Powerhouse", time:"8:00 PM", price:"$30", isFree:false, tags:["comedy","festival"], desc:"Top comedians perform at Brisbane Powerhouse. Always a brilliant night." },
    // FOOD
    { cat:"food", venue:"Jan Powers Farmers Market", suburb:"New Farm", url:"https://janpowersfarmersmarkets.com.au", title:"Farmers Markets — New Farm Powerhouse", time:"6:00 AM", price:"Free entry", isFree:true, tags:["markets","fresh produce"], desc:"Brisbane's best farmers market. Fresh produce, artisan goods, street food and coffee." },
    { cat:"food", venue:"Davies Park Market", suburb:"West End", url:"https://daviespark.com.au", title:"Davies Park Saturday Market", time:"6:00 AM", price:"Free entry", isFree:true, tags:["markets","organic","community"], desc:"West End's beloved Saturday market. Organic produce, street food, live music." },
    { cat:"food", venue:"Felons Brewing Co", suburb:"Howard Smith Wharves", url:"https://felons.com.au", title:"Craft Beer Tasting — Felons", time:"5:00 PM", price:"From $20", isFree:false, tags:["craft beer","brewery"], desc:"Guided tasting of Felons' seasonal brews on the banks of the Brisbane River." },
    { cat:"food", venue:"Eat Street Northshore", suburb:"Hamilton", url:"https://eatstreetnorthshore.com.au", title:"Eat Street Northshore Markets", time:"4:00 PM", price:"$3 entry", isFree:false, tags:["food market","street food"], desc:"200+ international food vendors in a vibrant container market on the river." },
    // OUTDOORS
    { cat:"outdoors", venue:"Kangaroo Point Cliffs", suburb:"Kangaroo Point", url:"https://meetup.com/brisbane-outdoor-adventures/", title:"Rock Climbing — Kangaroo Point", time:"6:00 AM", price:"Free", isFree:true, tags:["climbing","outdoors"], desc:"Free outdoor bouldering and top-rope climbing. Brisbane's climbing community welcomes beginners." },
    { cat:"outdoors", venue:"South Bank Parklands", suburb:"South Bank", url:"https://visitsouthbank.com.au", title:"Parkrun — South Bank", time:"7:00 AM", price:"Free", isFree:true, tags:["running","5km","parkrun"], desc:"Free weekly 5km timed run. Walk, jog or run — all welcome. Register at parkrun.com.au." },
    { cat:"outdoors", venue:"Mt Coot-tha", suburb:"Toowong", url:"https://meetup.com/brisbane-hiking-group/", title:"Sunrise Hike — Mt Coot-tha", time:"5:30 AM", price:"Free", isFree:true, tags:["hiking","sunrise"], desc:"Community sunrise hike with views over Brisbane. Bring water and a head torch." },
    { cat:"outdoors", venue:"Riverlife Adventure Centre", suburb:"Kangaroo Point", url:"https://riverlife.com.au", title:"Kayaking on the Brisbane River", time:"7:00 AM", price:"From $45", isFree:false, tags:["kayaking","adventure"], desc:"Guided kayaking on the Brisbane River. See the city skyline from the water." },
    // SPORTS
    { cat:"sports", venue:"Suncorp Stadium", suburb:"Milton", url:"https://premier.ticketek.com.au", title:"NRL at Suncorp Stadium", time:"7:35 PM", price:"From $25", isFree:false, tags:["NRL","rugby league"], desc:"Live NRL action at Suncorp Stadium — one of Australia's great sporting venues." },
    { cat:"sports", venue:"The Gabba", suburb:"Woolloongabba", url:"https://premier.ticketek.com.au", title:"AFL: Brisbane Lions — The Gabba", time:"4:35 PM", price:"From $28", isFree:false, tags:["AFL","Brisbane Lions"], desc:"The Lions play at the Gabba. Join thousands of fans for live AFL action." },
    // COMMUNITY
    { cat:"community", venue:"Archive Beer Boutique", suburb:"Fortitude Valley", url:"https://archivebeer.com.au", title:"Trivia Night — Archive Beer Boutique", time:"7:00 PM", price:"Free", isFree:true, tags:["trivia","pub quiz","social"], desc:"Weekly trivia at one of Brisbane's best beer bars. Teams up to 6. Great prizes." },
    { cat:"community", venue:"Noraebang Karaoke", suburb:"Sunnybank", url:"https://eventbrite.com.au/d/australia--brisbane/community/", title:"Korean Karaoke — Noraebang Sunnybank", time:"8:00 PM", price:"From $15/hr per room", isFree:false, tags:["karaoke","korean","social"], desc:"Private karaoke rooms in Sunnybank. Korean and international song catalogues." },
    { cat:"community", venue:"Hub Brisbane", suburb:"Brisbane City", url:"https://hubaustralia.com", title:"Tech & Startup Meetup Brisbane", time:"6:30 PM", price:"Free", isFree:true, tags:["tech","networking","startup"], desc:"Brisbane's tech community gathers for talks, demos and networking. All welcome." },
    { cat:"community", venue:"The Regatta Hotel", suburb:"Toowong", url:"https://regattahotel.com.au", title:"Board Game Night — The Regatta", time:"6:00 PM", price:"Free", isFree:true, tags:["board games","social"], desc:"Huge game collection, friendly crowd. Brisbane's best board game pub night." },
    { cat:"community", venue:"River City Labs", suburb:"Fortitude Valley", url:"https://rivercitylabs.net", title:"Language Exchange Meetup Brisbane", time:"6:30 PM", price:"Free", isFree:true, tags:["language","multicultural","social"], desc:"Practice English, Spanish, French, Japanese, Korean and more. All welcome." },
    // FAMILY
    { cat:"family", venue:"Lone Pine Koala Sanctuary", suburb:"Fig Tree Pocket", url:"https://lonepinekoalasanctuary.com", title:"Lone Pine Koala Sanctuary", time:"9:00 AM", price:"From $45", isFree:false, tags:["family","animals","kids"], desc:"The world's largest koala sanctuary. Hold a koala, hand-feed kangaroos." },
    { cat:"family", venue:"South Bank Parklands", suburb:"South Bank", url:"https://visitsouthbank.com.au", title:"Free Family Fun — South Bank", time:"All Day", price:"Free", isFree:true, tags:["family","free","beach"], desc:"Free beach swimming, parklands, outdoor entertainment and markets every weekend." },
    { cat:"family", venue:"Queensland Museum", suburb:"South Brisbane", url:"https://museum.qld.gov.au", title:"Kids Discovery — Queensland Museum", time:"9:30 AM", price:"Free", isFree:true, tags:["family","kids","education"], desc:"Interactive exhibits for children at the Queensland Museum. Free general admission." },
  ];

  // Use date as seed to vary which events appear each day
  const weekendOnly = ["markets", "parkrun"];
  const available = VENUE_TEMPLATES.filter(e => {
    if (!isWknd && e.tags.some(t => weekendOnly.includes(t))) return false;
    return true;
  });

  // Pick a varied subset based on date seed
  return available
    .filter((_, i) => sr(i) < (isWknd ? 0.85 : 0.65))
    .map((e, i) => ({
      ...e,
      id: `fb_${id++}`,
      source: "fallback",
      isLive: false,
    }));
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
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date. Use YYYY-MM-DD" });
  }

  try {
    // Fetch real events in parallel
    const [ebEvents, tmEvents] = await Promise.allSettled([
      fetchEventbrite(date),
      fetchTicketmaster(date),
    ]);

    const liveEvents = [
      ...(ebEvents.status === "fulfilled" ? ebEvents.value : []),
      ...(tmEvents.status === "fulfilled" ? tmEvents.value : []),
    ];

    // Generate fallback for categories not covered by live data
    const fallback = generateFallback(date);
    const coveredCats = new Set(liveEvents.map(e => e.category));
    const fillIn = liveEvents.length > 5
      ? fallback.filter(e => !coveredCats.has(e.category))
      : fallback;

    const all = dedup([...liveEvents, ...fillIn]);

    return res.status(200).json({
      events: all,
      meta: {
        date,
        total: all.length,
        live: liveEvents.length,
        sources: {
          eventbrite: ebEvents.status === "fulfilled" ? ebEvents.value.length : 0,
          ticketmaster: tmEvents.status === "fulfilled" ? tmEvents.value.length : 0,
          fallback: all.length - liveEvents.length,
        }
      }
    });
  } catch (err) {
    console.error("Events API error:", err);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
}
