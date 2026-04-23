import { useState, useEffect } from "react";
import Head from "next/head";

const CAT_ICONS = { music:"🎵", arts:"🎨", food:"🍽️", markets:"🛒", outdoors:"🥾", comedy:"😂", sports:"⚽", community:"🤝", nightlife:"🌙", family:"👨‍👩‍👧", other:"📌" };
const CAT_LABELS = { music:"Music", arts:"Arts & Culture", food:"Food & Drink", markets:"Markets", outdoors:"Outdoors", comedy:"Comedy", sports:"Sports", community:"Community", nightlife:"Nightlife", family:"Family", other:"Other" };
const FILTERS = ["all","music","nightlife","arts","comedy","food","markets","community","outdoors","sports","family","free"];
const SOURCE_COLORS = { ticketmaster:"#026CDF", brisbanecouncil:"#FF9F1C", parkrun:"#2ECC71", fallback:"#555", community:"#C77DFF" };

// ── CONFIRMED REAL BRISBANE VENUES (all URLs verified working) ────────────────
const VENUES = [
  // MUSIC
  { id:"v1", cat:"music", name:"The Triffid", suburb:"Newstead", type:"Live Music Venue", desc:"Brisbane's home of live music in a converted WW2 hangar. Intimate shows across multiple spaces with a great beer garden.", url:"https://www.thetriffid.com.au/whats-on" },
  { id:"v2", cat:"music", name:"Fortitude Music Hall", suburb:"Fortitude Valley", type:"Live Music Venue", desc:"Brisbane's grandest live music venue. Stunning heritage building hosting major national and international acts.", url:"https://www.thefortitude.com.au/whats-on" },
  { id:"v3", cat:"music", name:"The Tivoli", suburb:"Fortitude Valley", type:"Live Music Venue", desc:"Brisbane's original home of live music since 1989. Fiercely independent, locally owned and loved.", url:"https://thetivoli.com.au/events" },
  { id:"v4", cat:"music", name:"Crowbar Brisbane", suburb:"Fortitude Valley", type:"Live Music Bar", desc:"Punk, hardcore and metal bar at the old Zoo venue on Ann St. Open plan, laid back, brilliant atmosphere.", url:"https://crowbarbrisbane.com/tickets/" },
  { id:"v5", cat:"music", name:"Brisbane Powerhouse", suburb:"New Farm", type:"Arts & Music Venue", desc:"Queensland's home for contemporary culture. Theatre, comedy, music festivals and more in a stunning riverside venue.", url:"https://brisbanepowerhouse.org/events/" },
  { id:"v6", cat:"music", name:"QPAC", suburb:"South Brisbane", type:"Performing Arts Centre", desc:"Queensland's premier performing arts centre. Opera, ballet, theatre and major productions.", url:"https://www.qpac.com.au/whats-on" },
  // NIGHTLIFE
  { id:"v7", cat:"nightlife", name:"Cloudland", suburb:"Fortitude Valley", type:"Nightclub & Bar", desc:"Brisbane's most iconic nightclub. Multiple rooms, retractable roof garden, world-class DJs every weekend.", url:"https://www.cloudland.tv/whats-on-cloudland/" },
  { id:"v8", cat:"nightlife", name:"The Wickham Hotel", suburb:"Fortitude Valley", type:"LGBTQ+ Pub & Bar", desc:"Brisbane's iconic LGBTQ+ venue. Drag shows, DJ nights, rooftop bar and a welcoming crowd every night.", url:"https://thewickham.com.au/live-entertainment/" },
  { id:"v9", cat:"nightlife", name:"Black Bear Lodge", suburb:"Fortitude Valley", type:"Live Music Bar", desc:"Intimate live music bar at 322 Brunswick St. Local and touring acts, free entry most nights.", url:"https://blackbearlodge.bar/events" },
  // ARTS
  { id:"v11", cat:"arts", name:"GOMA", suburb:"South Brisbane", type:"Art Gallery", desc:"Gallery of Modern Art — world-class contemporary art. Free entry to permanent collection. Special exhibitions vary.", url:"https://www.qagoma.qld.gov.au/whats-on/" },
  { id:"v12", cat:"arts", name:"Metro Arts", suburb:"West End", type:"Contemporary Arts Centre", desc:"Brisbane's home for independent contemporary arts. Exhibitions, performances and creative community events.", url:"https://metroarts.com.au/whats-on/" },
  // COMEDY
  { id:"v13", cat:"comedy", name:"Sit Down Comedy Club", suburb:"Paddington", type:"Comedy Club", desc:"Brisbane's dedicated stand-up comedy club since 1992. Weekly shows from local and international comedians.", url:"https://www.standup.com.au" },
  // FOOD
  { id:"v14", cat:"markets", name:"West End Markets", suburb:"West End", type:"Weekend Market — Every Saturday", desc:"Every Saturday 6am–2pm at Davies Park. 150+ vendors, fresh produce, street food, live music. Free entry.", url:"https://westendmarket.com.au" },
  { id:"v15", cat:"markets", name:"Jan Powers Farmers Markets", suburb:"New Farm & Manly", type:"Farmers Market — Weekly", desc:"Saturdays at Brisbane Powerhouse (6am–12pm). Also Manly 1st & 3rd Saturday, Eagle Farm every Sunday.", url:"https://www.janpowersfarmersmarkets.com.au" },
  { id:"v16", cat:"food", name:"Howard Smith Wharves", suburb:"Brisbane City", type:"Dining & Bar Precinct", desc:"Stunning riverside precinct under the Story Bridge. Bars, restaurants and regular public events.", url:"https://howardsmithwharves.com/whats-on/" },
  // COMMUNITY
  { id:"v19", cat:"community", name:"Brisbane Meetup Groups", suburb:"Various", type:"Social Meetups", desc:"Hundreds of Brisbane Meetup groups — hiking, language exchange, board games, tech, trivia and more.", url:"https://www.meetup.com/find/au--brisbane/" },
  { id:"v20", cat:"community", name:"River City Labs", suburb:"Fortitude Valley", type:"Tech & Startup Hub", desc:"Queensland's leading tech innovation hub. Workshops, networking events, founder meetups and startup programs.", url:"https://rivercitylabs.acs.org.au/go-virtual.html" },
];

// ── ACTIVITIES — 3-level hierarchy: Subcat → Type → Items ────────────────────
// free:true = show up anytime | free:false = booking required
const ACTIVITIES = {
  brisbane: [
    {
      id: "fitness",
      subcat: "🏃 Fitness",
      types: [
        {
          id: "run",
          type: "🏃 Run",
          items: [
            { id:"a1",  name:"South Bank Parkrun",        suburb:"South Bank",           free:true,  detail:"Every Saturday 7am · Free", desc:"Brisbane's biggest parkrun. 460+ runners along South Bank Parklands. Register free once at parkrun.com.au — just show up.", url:"https://www.parkrun.com.au/southbank/" },
            { id:"a2",  name:"New Farm Parkrun",          suburb:"New Farm",             free:true,  detail:"Every Saturday 7am · Free", desc:"Scenic riverside run through New Farm Park along the Brisbane River. 340+ regulars.", url:"https://www.parkrun.com.au/newfarm/" },
            { id:"a3",  name:"Rocks Riverside Parkrun",   suburb:"Seventeen Mile Rocks", free:true,  detail:"Every Saturday 7am · Free", desc:"360+ finishers weekly. Beautiful riverside park setting, one of Brisbane's most popular.", url:"https://www.parkrun.com.au/rocksriverside/" },
            { id:"a4",  name:"Sandgate Parkrun",          suburb:"Sandgate",             free:true,  detail:"Every Saturday 7am · Free", desc:"Coastal run along the Sandgate foreshore with Moreton Bay views. 345+ runners.", url:"https://www.parkrun.com.au/sandgate/" },
            { id:"a5",  name:"Mitchelton Parkrun",        suburb:"Everton Park",         free:true,  detail:"Every Saturday 7am · Free", desc:"300+ runners every Saturday through Mitchelton's green parklands.", url:"https://www.parkrun.com.au/mitchelton/" },
            { id:"a6",  name:"Kelvin Grove Parkrun",      suburb:"Kelvin Grove",         free:true,  detail:"Every Saturday 7am · Free", desc:"Inner-city parkrun at Bishop Street Park. Easy access from CBD.", url:"https://www.parkrun.com.au/kelvingrove/" },
            { id:"a7",  name:"Ashgrove Parkrun",          suburb:"Ashgrove",             free:true,  detail:"Every Saturday 7am · Free", desc:"Hilly and rewarding course through Ashgrove parklands. Great café community post-run.", url:"https://www.parkrun.com.au/ashgrove/" },
            { id:"a8",  name:"Kedron Parkrun",            suburb:"Kedron",               free:true,  detail:"Every Saturday 7am · Free", desc:"Flat and fast at Kedron Park. Ideal for PB chasers. 200+ regulars.", url:"https://www.parkrun.com.au/kedron/" },
            { id:"a9",  name:"Stones Corner Parkrun",     suburb:"Greenslopes",          free:true,  detail:"Every Saturday 7am · Free", desc:"Beautiful course along the creek and parks of Stones Corner. One of Brisbane's most scenic.", url:"https://www.parkrun.com.au/stonescorner/" },
            { id:"a10", name:"St Lucia Parkrun",          suburb:"St Lucia",             free:true,  detail:"Every Saturday 7am · Free", desc:"Flat and shaded riverside run at UQ campus with stunning Brisbane River views.", url:"https://www.parkrun.com.au/stlucia/" },
            { id:"a11", name:"Minnippi Parkrun",          suburb:"Carindale",            free:true,  detail:"Every Saturday 7am · Free", desc:"Loop around the ancient Minnippi lagoon. Brisbane's most unique parkrun setting — like a secret garden.", url:"https://www.parkrun.com.au/minnippi/" },
            { id:"a12", name:"Wynnum Parkrun",            suburb:"Wynnum",               free:true,  detail:"Every Saturday 7am · Free", desc:"Bayside run along the Wynnum foreshore with Moreton Bay views.", url:"https://www.parkrun.com.au/wynnum/" },
            { id:"a13", name:"Chermside Parkrun",         suburb:"Chermside",            free:true,  detail:"Every Saturday 7am · Free", desc:"Popular northside parkrun. 200+ runners every week through Chermside parks.", url:"https://www.parkrun.com.au/chermside/" },
            { id:"a14", name:"Mansfield Parkrun",         suburb:"Mansfield",            free:true,  detail:"Every Saturday 7am · Free", desc:"Southside parkrun at Tillack Park. Friendly community, all paces welcome.", url:"https://www.parkrun.com.au/mansfieldqld/" },
            { id:"a15", name:"Forest Lake Parkrun",       suburb:"Forest Lake",          free:true,  detail:"Every Saturday 7am · Free", desc:"Lakeside loop through Forest Lake's waterfront parklands.", url:"https://www.parkrun.com.au/forestlake/" },
            { id:"a16", name:"Calamvale Parkrun",         suburb:"Calamvale",            free:true,  detail:"Every Saturday 7am · Free", desc:"Flat and accessible parkrun at Calamvale District Park. Great for beginners.", url:"https://www.parkrun.com.au/calamvale/" },
            { id:"a17", name:"Wishart Parkrun",           suburb:"Wishart",              free:true,  detail:"Every Saturday 7am · Free", desc:"Quiet southside parkrun through Wishart's parks. Small, welcoming community.", url:"https://www.parkrun.com.au/wishart/" },
            { id:"a18", name:"Lota Parkrun",              suburb:"Lota",                 free:true,  detail:"Every Saturday 7am · Free", desc:"Bayside parkrun near Lota Creek. One of Brisbane's smaller, friendlier events.", url:"https://www.parkrun.com.au/lota/" },
            { id:"a19", name:"Pallara Parkrun",           suburb:"Pallara",              free:true,  detail:"Every Saturday 7am · Free", desc:"Brisbane's most intimate parkrun — ~47 runners. Tight-knit community in the south.", url:"https://www.parkrun.com.au/pallara/" },
            { id:"a20", name:"Zillmere Parkrun",          suburb:"Zillmere",             free:true,  detail:"Every Saturday 7am · Free", desc:"Northside parkrun at O'Callaghan Park. Small and friendly, great for first-timers.", url:"https://www.parkrun.com.au/zillmere/" },
            { id:"a21", name:"Samford Parklands Parkrun", suburb:"Samford",              free:true,  detail:"Every Saturday 7am · Free", desc:"Brisbane's newest parkrun (2024) in stunning semi-rural Samford Parklands.", url:"https://www.parkrun.com.au/samfordparklands/" },
          ]
        },
        {
          id: "yoga",
          type: "🧘 Yoga & Pilates",
          items: [
            { id:"a30", name:"BCC Free Yoga & Pilates Classes", suburb:"Various Brisbane Parks", free:true,  detail:"Various times · Free", desc:"Brisbane City Council runs free yoga, Pilates, aqua yoga and movement classes across 50+ parks and pools. All levels welcome. Check the full schedule for a class near you.", url:"https://www.brisbane.qld.gov.au/parks-and-recreation/sports-and-leisure/active-and-healthy-activities#yoga" },
          ]
        },
        {
          id: "groupfitness",
          type: "💪 Group Fitness",
          items: [
            { id:"a31", name:"BCC Free Fitness Classes", suburb:"Various Brisbane Parks", free:true,  detail:"Various times · Free", desc:"Free outdoor boxing, HIIT, Zumba, aqua aerobics and functional fitness classes across Brisbane parks and pools. No gym membership needed. All ages and abilities.", url:"https://www.brisbane.qld.gov.au/parks-and-recreation/sports-and-leisure/active-and-healthy-activities" },
          ]
        },
      ]
    },
    {
      id: "adventure",
      subcat: "🌊 Adventure",
      types: [
        {
          id: "climbing",
          type: "🧗 Climbing & Abseiling",
          items: [
            { id:"a40", name:"Riverlife Rock Climbing",   suburb:"Kangaroo Point", free:false, detail:"Day & night sessions · Book required", desc:"Climb the iconic 25m Kangaroo Point Cliffs with all safety gear provided. Day, twilight and night sessions. No experience needed.", url:"https://riverlife.com.au/tours/" },
            { id:"a41", name:"Riverlife Abseiling",       suburb:"Kangaroo Point", free:false, detail:"Twilight sessions · Book required",    desc:"Abseil down the Kangaroo Point Cliffs with sunset views over the Brisbane River. All gear provided. Suitable for beginners.", url:"https://riverlife.com.au/tours/" },
            { id:"a42", name:"Story Bridge Adventure Climb", suburb:"Brisbane City", free:false, detail:"Day, twilight & night · Book required", desc:"Scale Brisbane's most iconic bridge for 360° views — Glass House Mountains to Moreton Bay. ~1.5 hours. Harness and suit provided.", url:"https://storybridgeadventureclimb.com.au/activities/events/" },
          ]
        },
        {
          id: "water",
          type: "🚣 Water",
          items: [
            { id:"a50", name:"Riverlife Kayaking",        suburb:"Kangaroo Point", free:false, detail:"Day & twilight tours · Book required", desc:"Paddle the Brisbane River by day or twilight. The Friday night kayak includes Mexican food and margaritas on return. All equipment provided.", url:"https://riverlife.com.au/tours/" },
          ]
        },
        {
          id: "cycling",
          type: "🚵 Cycling",
          items: [
            { id:"a60", name:"Riverlife Bike Hire",       suburb:"Kangaroo Point", free:false, detail:"Hourly & daily hire · Book required",  desc:"Hire a road bike, e-bike or tandem and explore Brisbane's riverside paths. Helmets included. City Nights Picnic Ride also available for couples.", url:"https://riverlife.com.au/tours/" },
          ]
        },
      ]
    },
    {
      id: "experiences",
      subcat: "🍺 Experiences",
      types: [
        {
          id: "brewery",
          type: "🍺 Food & Drink Tours",
          items: [
            { id:"a70", name:"XXXX Brewery Tour",         suburb:"Milton",         free:false, detail:"90 min tour · Book required",         desc:"Insider tour of Queensland's iconic XXXX Brewery. See the brewing process up close, taste 4 fresh beers and learn the perfect pour. 135 years of heritage.", url:"https://www.xxxx.com.au/brewery-tours" },
          ]
        },
      ]
    },
  ],
  aroundBrisbane: [
    {
      id: "daytrips",
      subcat: "🏖️ Day Trips",
      types: [
        {
          id: "islands",
          type: "🏝️ Islands",
          items: [
            { id:"b1", name:"Moreton Island Day Trip",    suburb:"Moreton Bay (75min ferry)", free:false, detail:"Full day · Ferry required", desc:"Snorkel the Tangalooma wrecks, sandboard the desert and spot wild dolphins feeding at sunset. One of Queensland's most beautiful islands.", url:"https://www.tangalooma.com/day-cruise" },
            { id:"b2", name:"North Stradbroke Island",    suburb:"Moreton Bay (30min ferry)", free:false, detail:"Full day · Ferry from Cleveland", desc:"Pristine beaches, whale watching (June–Nov), snorkelling and 4WD adventures. 30 min ferry from Cleveland.", url:"https://www.stradbrokeisland.com" },
          ]
        },
        {
          id: "wildlife",
          type: "🐨 Wildlife",
          items: [
            { id:"b3", name:"Australia Zoo",              suburb:"Beerwah (1hr north)",       free:false, detail:"Full day · Book recommended",  desc:"Steve Irwin's world-famous wildlife park. Crocs, koalas, tigers and 1,200+ animals. Daily wildlife shows. 1 hour north of Brisbane.", url:"https://www.australiazoo.com.au" },
            { id:"b4", name:"Lone Pine Koala Sanctuary",  suburb:"Fig Tree Pocket (20min)",   free:false, detail:"Half or full day · Book recommended", desc:"World's first and largest koala sanctuary. Hold a koala, hand-feed kangaroos and meet 70+ species of Australian wildlife.", url:"https://lonepinekoalasanctuary.com" },
          ]
        },
      ]
    },
    {
      id: "nature",
      subcat: "🌿 Nature",
      types: [
        {
          id: "walks",
          type: "🥾 Walks & Lookouts",
          items: [
            { id:"b10", name:"Mt Coot-tha Summit",        suburb:"Toowong (10min)",     free:true,  detail:"Free · Open daily",  desc:"Brisbane's best panoramic views from 287m. Free lookout, planetarium, botanical gardens and café. 10 min from the CBD — sunrise is spectacular.", url:"https://www.brisbane.qld.gov.au/things-to-see-and-do/council-venues-and-precincts/mt-coot-tha-precinct" },
            { id:"b11", name:"Bunyaville Conservation Park", suburb:"Bunya (20min)",    free:true,  detail:"Free · Open daily",  desc:"80+ hectares of native bushland with walking trails through eucalyptus forest. Free entry. Dog friendly on leash.", url:"https://parks.des.qld.gov.au/parks/bunyaville-conservation-park" },
          ]
        },
      ]
    },
  ]
};

// ── PARKRUN EVENTS — injected on Saturdays ───────────────────────────────────
// Every parkrun happens every Saturday at 7am — real events with date + location
function getParkrunEvents(date) {
  const dow = new Date(date + "T12:00:00").getDay();
  if (dow !== 6) return []; // Only Saturday (6)
  // Pull all parkrun items from the ACTIVITIES data
  const fitnessSubcat = ACTIVITIES.brisbane.find(s => s.id === "fitness");
  const runType = fitnessSubcat?.types.find(t => t.id === "run");
  if (!runType) return [];
  return runType.items.map(a => ({
    id: `parkrun_${a.id}`,
    title: a.name,
    venue: a.suburb,
    suburb: a.suburb,
    address: a.suburb + ", Brisbane",
    time: "7:00 AM",
    price: "Free",
    isFree: true,
    isEvening: false,
    category: "outdoors",
    tags: ["parkrun", "running", "free"],
    description: a.desc,
    url: a.url,
    source: "parkrun",
    isLive: true,
  }));
}
function getFmt(s) { return new Date(s+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"}); }
function todayStr() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function App() {
  const [date, setDate] = useState(todayStr());
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("events"); // "events" | "venues" | "activities"
  const [actLocation, setActLocation] = useState("brisbane");
  // openSubcats: Set of subcat ids that are open — persisted in localStorage
  // openTypes: Set of "subcatId/typeId" strings that are open
  const [openSubcats, setOpenSubcats] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("bne_open_subcats")||"[]")); } catch { return new Set(); }
  });
  const [openTypes, setOpenTypes] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("bne_open_types")||"[]")); } catch { return new Set(); }
  });

  function toggleSubcat(id) {
    setOpenSubcats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("bne_open_subcats", JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  function toggleType(subcatId, typeId) {
    const key = `${subcatId}/${typeId}`;
    setOpenTypes(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem("bne_open_types", JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  const [appStatus, setAppStatus] = useState("idle");
  const [meta, setMeta] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [openCats, setOpenCats] = useState(new Set()); // which category sections are collapsed

  function toggleCat(cat) {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }
  const [showModal, setShowModal] = useState(false);
  const [community, setCommunity] = useState([]);
  const [form, setForm] = useState({ name:"", date:"", time:"", venue:"", cat:"community", price:"free", link:"", desc:"" });

  useEffect(() => {
    try { setCommunity(JSON.parse(localStorage.getItem("bne_community")||"[]")); } catch {}
  }, []);

  // Filter logic — nightlife includes evening music/arts/comedy
  const filtered = (() => {
    if (filter === "all") return events;
    if (filter === "free") return events.filter(e => e.isFree);
    if (filter === "nightlife") return events.filter(e =>
      e.category === "nightlife" ||
      (e.isEvening && ["music","arts","comedy"].includes(e.category))
    );
    return events.filter(e => e.category === filter);
  })();

  // Venue guide filter
  const filteredVenues = filter === "all" ? VENUES : VENUES.filter(v => v.cat === filter);

  async function search() {
    setAppStatus("loading"); setExpandedId(null); setEvents([]); setMeta(null);
    try {
      const res = await fetch(`/api/events?date=${date}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const comm = community.filter(e=>e.date===date).map(e=>({...e,source:"community",isLive:false}));
      const parkruns = getParkrunEvents(date);
      setEvents([...data.events, ...parkruns, ...comm]);
      setMeta({...data.meta, sources:{...data.meta.sources, parkrun: parkruns.length}});
      setAppStatus("done");
    } catch(err) { setAppStatus("error"); }
  }

  function grouped() {
    const order=["music","nightlife","arts","comedy","food","markets","community","outdoors","sports","family","other"];
    const map={};
    filtered.forEach(e=>{const c=e.category||"other";if(!map[c])map[c]=[];map[c].push(e);});
    return order.filter(c=>map[c]?.length).map(c=>({cat:c,evts:map[c]}));
  }

  function submitEvent() {
    if(!form.name||!form.date||!form.venue) return alert("Name, Date and Venue required.");
    const ev={id:`comm_${Date.now()}`,title:form.name,date:form.date,time:form.time,venue:form.venue,suburb:"Brisbane",category:form.cat,isFree:form.price==="free",price:form.price==="free"?"Free":"Paid",url:form.link,description:form.desc,tags:[form.cat],source:"community",isLive:false};
    const updated=[...community,ev]; setCommunity(updated);
    try{localStorage.setItem("bne_community",JSON.stringify(updated));}catch{}
    setShowModal(false);
    if(ev.date===date&&appStatus==="done") setEvents(p=>[...p,ev]);
    alert("Event added!");
  }

  const inp={width:"100%",background:"#181818",border:"1px solid #252525",borderRadius:8,color:"#E8E8E8",fontFamily:"inherit",fontSize:"0.9rem",padding:"10px 12px",outline:"none"};
  const lbl={fontSize:"0.7rem",color:"#777",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:14,marginBottom:5};

  return (
    <>
      <Head>
        <title>BNE Events — Every Event in Brisbane</title>
        <meta name="description" content="Find every event in Brisbane — concerts, markets, comedy, sports, meetups and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0A0A0A" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="app">

        {/* HEADER */}
        <header>
          <div className="logo-row">
            <span className="logo">BNE EVENTS</span>
            <span className="tagline">Every event in Brisbane</span>
          </div>

          {/* VIEW TOGGLE */}
          <div className="view-toggle">
            <button className={`toggle-btn${view==="events"?" active":""}`} onClick={()=>setView("events")}>📅 Events</button>
            <button className={`toggle-btn${view==="venues"?" active":""}`} onClick={()=>setView("venues")}>🏢 Venues</button>
            <button className={`toggle-btn${view==="activities"?" active":""}`} onClick={()=>setView("activities")}>🎯 Activities</button>
          </div>

          {/* DATE + SEARCH (only in events view) */}
          {view==="events"&&(
            <div className="search-row">
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="date-input"/>
              <button onClick={search} disabled={appStatus==="loading"} className="find-btn">
                {appStatus==="loading"?"⏳":"🔍 Find"}
              </button>
            </div>
          )}
        </header>

        {/* CATEGORY FILTERS — shown in both views */}
        <div className="filter-bar">
          {FILTERS.map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`chip${filter===f?" active":""}`}>
              {f==="all"?"All":f==="free"?"💚 Free":`${CAT_ICONS[f]} ${CAT_LABELS[f]}`}
            </button>
          ))}
        </div>

        {/* ── EVENTS VIEW ── */}
        {view==="events"&&(
          <>
            {/* STATS */}
            {appStatus==="done"&&meta&&(
              <div className="stats-bar">
                <div className="stats-row">
                  <span className="count">{filtered.length}</span>
                  <span className="stats-text"> events · {getDOW(date)}</span>
                  <span className="stats-date">{getFmt(date)}</span>
                </div>
                <div className="stats-sources">
                  {meta.sources.ticketmaster>0&&<span className="pill tm">🔵 {meta.sources.ticketmaster} Ticketmaster</span>}
                  {meta.sources.brisbanecouncil>0&&<span className="pill bcc">🟠 {meta.sources.brisbanecouncil} BCC</span>}
                  {meta.sources.parkrun>0&&<span className="pill pr">🟢 {meta.sources.parkrun} Parkrun</span>}
                </div>
              </div>
            )}

            {/* LOADING */}
            {appStatus==="loading"&&(
              <div className="loading-wrap">
                <div className="loading-text">🔎 Scanning Brisbane events...</div>
                <div className="prog-bar"><div className="prog-fill"/></div>
                {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{animationDelay:`${i*0.12}s`}}/>)}
              </div>
            )}

            {/* ERROR */}
            {appStatus==="error"&&<div className="error-box">⚠️ Failed to load. Check connection and try again.</div>}

            {/* IDLE */}
            {appStatus==="idle"&&(
              <div className="welcome">
                <div style={{fontSize:"3rem"}}>📅</div>
                <h1 className="welcome-title">What's on in Brisbane?</h1>
                <p className="welcome-sub">Pick a date and hit Find to see everything. Tap a category filter first if you want to narrow it down — music, nightlife, sports, family and more.</p>
              </div>
            )}

            {/* NO RESULTS */}
            {appStatus==="done"&&filtered.length===0&&(
              <div className="empty">
                <div style={{fontSize:"2.5rem"}}>🗓️</div>
                {events.length===0 ? (
                  <>
                    <div className="empty-title">No Events Found</div>
                    <p className="empty-sub">Nothing listed for this date yet — BCC publishes events 4–6 weeks ahead. Try another date, or browse venues below.</p>
                    <button className="switch-btn" onClick={()=>setView("venues")}>🏢 Browse Venues →</button>
                  </>
                ) : (
                  <>
                    <div className="empty-title">No {filter==="free"?"Free":CAT_LABELS[filter]||""} Events</div>
                    <p className="empty-sub">No events match this filter for {getFmt(date)}. Tap All to see everything.</p>
                    <button className="switch-btn" onClick={()=>setFilter("all")}>Show All Events</button>
                  </>
                )}
              </div>
            )}

            {/* EVENTS LIST */}
            {appStatus==="done"&&filtered.length>0&&(
              <div className="events-list">
                {filter!=="all"
                  ?filtered.map((e,i)=><EventCard key={e.id} e={e} expanded={expandedId===e.id} onToggle={()=>setExpandedId(expandedId===e.id?null:e.id)} delay={i*35}/>)
                  :grouped().map(({cat,evts})=>{
                  const isCollapsed = openCats.has(cat);
                  return (
                    <div key={cat}>
                      <button className="section-header" onClick={()=>toggleCat(cat)}>
                        <span>{CAT_ICONS[cat]} {CAT_LABELS[cat]}</span>
                        <span style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:"0.6rem",color:"#555"}}>{evts.length}</span>
                          <span style={{fontSize:"0.6rem",color:"#555"}}>{isCollapsed?"▶":"▼"}</span>
                        </span>
                      </button>
                      {!isCollapsed&&evts.map((e,i)=><EventCard key={e.id} e={e} expanded={expandedId===e.id} onToggle={()=>setExpandedId(expandedId===e.id?null:e.id)} delay={i*35}/>)}
                    </div>
                  );
                })
                }
              </div>
            )}
          </>
        )}

        {/* ── VENUE GUIDE VIEW ── */}
        {view==="venues"&&(
          <div className="events-list">
            <div style={{padding:"12px 0 4px",fontSize:"0.72rem",color:"#777"}}>
              {filteredVenues.length} venues · tap any to see what's on
            </div>
            {filteredVenues.map(v=>(
              <div key={v.id} className="venue-card">
                <div className="venue-top">
                  <div>
                    <div className="venue-name">{v.name}</div>
                    <div className="venue-meta">{CAT_ICONS[v.cat]} {v.type} · {v.suburb}</div>
                  </div>
                </div>
                <div className="venue-desc">{v.desc}</div>
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn-venue">See What's On →</a>
              </div>
            ))}
            {filteredVenues.length===0&&(
              <div className="empty">
                <div style={{fontSize:"2rem"}}>🔍</div>
                <div className="empty-sub">No venues in this category yet.</div>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITIES VIEW ── */}
        {view==="activities"&&(
          <div className="events-list">
            <div className="act-location-toggle">
              <button className={`act-loc-btn${actLocation==="brisbane"?" active":""}`} onClick={()=>setActLocation("brisbane")}>📍 Brisbane</button>
              <button className={`act-loc-btn${actLocation==="aroundBrisbane"?" active":""}`} onClick={()=>setActLocation("aroundBrisbane")}>🗺️ Around Brisbane</button>
            </div>

            {ACTIVITIES[actLocation].map(subcat=>{
              const isSubOpen = openSubcats.has(subcat.id);
              return (
                <div key={subcat.id} className="act-subcat">
                  {/* Level 1 — Subcat header (Fitness / Adventure / Experiences) */}
                  <button className="act-subcat-header" onClick={()=>toggleSubcat(subcat.id)}>
                    <span className="act-subcat-label">{subcat.subcat}</span>
                    <span className="act-chevron">{isSubOpen?"▼":"▶"}</span>
                  </button>

                  {isSubOpen&&subcat.types.map(typeGroup=>{
                    const typeKey = `${subcat.id}/${typeGroup.id}`;
                    const isTypeOpen = openTypes.has(typeKey);
                    return (
                      <div key={typeGroup.id} className="act-type">
                        {/* Level 2 — Type header (Run / Yoga / Climbing etc) */}
                        <button className="act-type-header" onClick={()=>toggleType(subcat.id, typeGroup.id)}>
                          <span className="act-type-label">{typeGroup.type}</span>
                          <span className="act-type-count">{typeGroup.items.length}</span>
                          <span className="act-chevron-sm">{isTypeOpen?"▼":"▶"}</span>
                        </button>

                        {isTypeOpen&&typeGroup.items.map((a,i)=>(
                          /* Level 3 — Individual activity card */
                          <div key={a.id} className="activity-card" style={{animationDelay:`${i*30}ms`}}>
                            <div className="act-top">
                              <div style={{flex:1}}>
                                <div className="act-name">{a.name}</div>
                                <div className="act-meta">{a.detail} · {a.suburb}</div>
                              </div>
                              <span className={`act-badge ${a.free?"act-free":"act-paid"}`}>{a.free?"Free":"Book"}</span>
                            </div>
                            <div className="act-desc">{a.desc}</div>
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className={`btn-act ${a.free?"btn-act-free":"btn-act-book"}`}>
                              {a.free?"More Info →":"Book Now →"}
                            </a>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* FAB */}
        <button className="fab" onClick={()=>{setForm(f=>({...f,date}));setShowModal(true);}}>＋ Submit Event</button>

        {/* SUBMIT MODAL */}
        {showModal&&(
          <div className="modal-overlay" onClick={()=>setShowModal(false)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">Submit an Event</div>
              <p className="modal-sub">Know something not showing? Add it for the community.</p>
              {[{l:"Event Name *",t:"text",k:"name",p:"e.g. Korean Karaoke Night"},{l:"Date *",t:"date",k:"date"},{l:"Time",t:"time",k:"time"},{l:"Venue *",t:"text",k:"venue",p:"e.g. The Triffid"},{l:"Link",t:"url",k:"link",p:"https://..."}].map(({l,t,k,p})=>(
                <div key={k}><div style={lbl}>{l}</div><input type={t} placeholder={p} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inp}/></div>
              ))}
              <div style={lbl}>Category</div>
              <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))} style={inp}>
                {Object.entries(CAT_LABELS).map(([v,l])=><option key={v} value={v}>{CAT_ICONS[v]} {l}</option>)}
              </select>
              <div style={lbl}>Free or Paid?</div>
              <select value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} style={inp}>
                <option value="free">Free</option><option value="paid">Paid</option>
              </select>
              <div style={lbl}>Description</div>
              <textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="What is it about?" style={{...inp,minHeight:80,resize:"vertical"}}/>
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button onClick={()=>setShowModal(false)} className="btn-cancel">Cancel</button>
                <button onClick={submitEvent} className="btn-submit">Add Event ✓</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        html,body{background:#0A0A0A;color:#E8E8E8;font-family:'DM Sans',system-ui,sans-serif}
        ::-webkit-scrollbar{display:none}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1) opacity(0.4)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:0.35}50%{opacity:0.9}}

        .app{max-width:480px;margin:0 auto;min-height:100vh}

        header{position:sticky;top:0;z-index:50;background:#0A0A0A;border-bottom:1px solid #252525;padding:12px 16px 10px}
        .logo-row{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
        .logo{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#F5E642;letter-spacing:3px;line-height:1}
        .tagline{font-size:0.6rem;color:#777;letter-spacing:1.5px;text-transform:uppercase}

        .view-toggle{display:flex;gap:6px;margin-bottom:10px}
        .toggle-btn{flex:1;background:#181818;color:#777;border:1px solid #252525;border-radius:8px;padding:7px;font-family:inherit;font-size:0.8rem;font-weight:500;cursor:pointer;transition:all 0.15s}
        .toggle-btn.active{background:#F5E642;color:#0A0A0A;border-color:#F5E642;font-weight:700}

        .search-row{display:flex;gap:8px}
        .date-input{flex:1;background:#181818;border:1px solid #252525;border-radius:10px;color:#E8E8E8;font-family:inherit;font-size:0.95rem;padding:10px 14px;outline:none}
        .date-input:focus{border-color:#F5E642}
        .find-btn{background:#F5E642;color:#0A0A0A;border:none;border-radius:10px;padding:10px 20px;font-family:inherit;font-weight:700;font-size:0.9rem;cursor:pointer}
        .find-btn:disabled{opacity:0.6;background:#3a3a00}

        .filter-bar{display:flex;gap:8px;overflow-x:auto;padding:10px 16px;border-bottom:1px solid #252525;scrollbar-width:none}
        .chip{background:#181818;color:#777;border:1px solid #252525;border-radius:20px;padding:6px 14px;font-size:0.75rem;font-weight:500;white-space:nowrap;cursor:pointer;flex-shrink:0;font-family:inherit;transition:all 0.15s}
        .chip.active{background:#F5E642;color:#0A0A0A;border-color:#F5E642;font-weight:700}
        .chip:active{transform:scale(0.93)}

        .stats-bar{background:#111;border-bottom:1px solid #252525;padding:8px 16px}
        .stats-row{display:flex;align-items:center;gap:4px;margin-bottom:5px}
        .count{color:#F5E642;font-weight:700;font-size:0.9rem}
        .stats-text{font-size:0.78rem;color:#777}
        .stats-date{font-size:0.68rem;color:#777;margin-left:auto}
        .stats-sources{display:flex;flex-wrap:wrap;gap:6px}
        .pill{font-size:0.62rem;padding:2px 8px;border-radius:10px}
        .pill.tm{background:rgba(2,108,223,0.15);color:#4CC9F0}
        .pill.bcc{background:rgba(255,140,0,0.15);color:#FF9F1C}
        .pill.pr{background:rgba(46,204,113,0.15);color:#2ECC71}
        .pill.fb{background:rgba(255,255,255,0.06);color:#777}

        .loading-wrap{padding:20px 16px}
        .loading-text{text-align:center;color:#F5E642;font-size:0.8rem;margin-bottom:12px}
        .prog-bar{height:2px;background:#252525;border-radius:2px;overflow:hidden;margin-bottom:16px}
        .prog-fill{height:100%;width:65%;background:#F5E642;border-radius:2px;animation:glow 1.4s ease-in-out infinite}
        .skeleton{background:#181818;border-radius:12px;height:95px;margin-bottom:10px;border:1px solid #252525;animation:glow 1.4s ease-in-out infinite}

        .error-box{margin:16px;background:rgba(255,59,48,0.1);border:1px solid rgba(255,59,48,0.3);border-radius:10px;padding:14px 16px;font-size:0.85rem;color:#ff6b6b}

        .welcome{text-align:center;padding:50px 30px 40px;display:flex;flex-direction:column;align-items:center;gap:12px}
        .welcome-title{font-family:'Bebas Neue',sans-serif;font-size:1.8rem;color:#F5E642;letter-spacing:2px}
        .welcome-sub{font-size:0.83rem;color:#777;line-height:1.75;max-width:290px}

        .empty{text-align:center;padding:50px 20px;display:flex;flex-direction:column;align-items:center;gap:10px}
        .empty-title{font-family:'Bebas Neue',sans-serif;font-size:1.5rem;color:#F5E642}
        .empty-sub{font-size:0.83rem;color:#777;max-width:280px;line-height:1.6}
        .switch-btn{margin-top:8px;background:#F5E642;color:#0A0A0A;border:none;border-radius:20px;padding:10px 20px;font-family:inherit;font-weight:700;font-size:0.85rem;cursor:pointer}

        .events-list{padding:12px 16px 100px}
        .section-header{display:flex;align-items:center;justify-content:space-between;padding:14px 0 8px;font-size:0.58rem;text-transform:uppercase;letter-spacing:2px;color:#777;width:100%;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left}
        .section-header:active{opacity:0.7}
        .divider{flex:1;height:1px;background:#252525;margin-left:8px}

        /* EVENT CARDS */
        .event-card{background:#181818;border:1px solid #252525;border-radius:14px;padding:14px 14px 14px 18px;margin-bottom:9px;position:relative;overflow:hidden;cursor:pointer;transition:border-color 0.15s,transform 0.1s;animation:fadeUp 0.3s ease both}
        .event-card:active{transform:scale(0.97)}
        .event-card.expanded{border-color:#F5E642}
        .card-accent{position:absolute;top:0;left:0;width:3px;height:100%}
        .live-badge{position:absolute;top:10px;right:10px;font-size:0.55rem;background:rgba(245,230,66,0.15);color:#F5E642;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
        .card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
        .card-title{font-size:0.92rem;font-weight:600;line-height:1.35;flex:1}
        .price-badge{flex-shrink:0;font-size:0.67rem;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase}
        .price-free{background:rgba(46,204,113,0.15);color:#2ECC71}
        .price-paid{background:rgba(245,230,66,0.1);color:#F5E642}
        .price-various{background:rgba(255,255,255,0.07);color:#999}
        .card-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:7px}
        .meta-item{font-size:0.72rem;color:#777}
        .card-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
        .tag{font-size:0.6rem;padding:2px 8px;border-radius:5px;background:#252525;color:#777;text-transform:uppercase;letter-spacing:0.3px}
        .card-expanded{margin-top:14px;padding-top:14px;border-top:1px solid #252525}
        .card-desc{font-size:0.82rem;color:#aaa;line-height:1.7;margin-bottom:12px}
        .card-address{font-size:0.75rem;color:#777;margin-bottom:12px}
        .card-actions{display:flex;gap:8px}
        .btn-ticket{flex:1;background:#F5E642;color:#0A0A0A;border:none;border-radius:8px;padding:10px 14px;font-weight:700;font-size:0.82rem;text-decoration:none;text-align:center;display:block;cursor:pointer;font-family:inherit}
        .btn-free{background:#2ECC71;color:#0A0A0A}
        .btn-share{background:transparent;color:#E8E8E8;border:1px solid #252525;border-radius:8px;padding:10px 14px;font-size:0.82rem;cursor:pointer;font-family:inherit}
        .card-source{margin-top:10px;font-size:0.6rem;color:#777;display:flex;align-items:center;gap:5px}
        .source-dot{width:5px;height:5px;border-radius:50%;display:inline-block}

        /* VENUE CARDS */
        .venue-card{background:#181818;border:1px solid #252525;border-radius:14px;padding:16px;margin-bottom:9px;animation:fadeUp 0.3s ease both}
        .venue-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
        .venue-name{font-size:0.95rem;font-weight:700;color:#E8E8E8;margin-bottom:3px}
        .venue-meta{font-size:0.72rem;color:#FF9F1C}
        .venue-desc{font-size:0.82rem;color:#aaa;line-height:1.6;margin-bottom:12px}
        .btn-venue{display:block;background:#FF9F1C;color:#0A0A0A;border:none;border-radius:8px;padding:10px 14px;font-weight:700;font-size:0.82rem;text-decoration:none;text-align:center;font-family:inherit;cursor:pointer}

        /* ACTIVITY 3-LEVEL HIERARCHY */
        .act-location-toggle{display:flex;gap:8px;margin-bottom:14px}
        .act-loc-btn{flex:1;background:#181818;color:#777;border:1px solid #252525;border-radius:8px;padding:8px;font-family:inherit;font-size:0.8rem;font-weight:500;cursor:pointer;transition:all 0.15s}
        .act-loc-btn.active{background:#FF9F1C;color:#0A0A0A;border-color:#FF9F1C;font-weight:700}

        /* Level 1 — Subcat (Fitness / Adventure / Experiences) */
        .act-subcat{margin-bottom:8px;border-radius:12px;overflow:hidden;border:1px solid #252525}
        .act-subcat-header{width:100%;display:flex;justify-content:space-between;align-items:center;background:#1E1E1E;border:none;color:#E8E8E8;padding:14px 16px;cursor:pointer;font-family:inherit;text-align:left}
        .act-subcat-label{font-size:1rem;font-weight:700;letter-spacing:0.3px}
        .act-chevron{font-size:0.7rem;color:#FF9F1C}

        /* Level 2 — Type (Run / Yoga / Climbing) */
        .act-type{border-top:1px solid #252525}
        .act-type-header{width:100%;display:flex;align-items:center;gap:8px;background:#181818;border:none;color:#aaa;padding:10px 16px 10px 24px;cursor:pointer;font-family:inherit;text-align:left}
        .act-type-label{font-size:0.85rem;font-weight:600;flex:1;color:#E8E8E8}
        .act-type-count{font-size:0.65rem;background:#252525;color:#777;padding:2px 7px;border-radius:10px}
        .act-chevron-sm{font-size:0.6rem;color:#777}

        /* Level 3 — Individual activity card */
        .activity-card{background:#141414;padding:14px 16px 14px 24px;border-top:1px solid #1E1E1E;animation:fadeUp 0.25s ease both}
        .act-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:10px}
        .act-name{font-size:0.88rem;font-weight:600;color:#E8E8E8;margin-bottom:2px}
        .act-meta{font-size:0.68rem;color:#777}
        .act-badge{flex-shrink:0;font-size:0.62rem;font-weight:700;padding:3px 7px;border-radius:5px;text-transform:uppercase}
        .act-free{background:rgba(46,204,113,0.15);color:#2ECC71}
        .act-paid{background:rgba(245,230,66,0.1);color:#F5E642}
        .act-desc{font-size:0.78rem;color:#888;line-height:1.55;margin-bottom:10px}
        .btn-act{display:block;border:none;border-radius:7px;padding:9px 14px;font-weight:700;font-size:0.78rem;text-decoration:none;text-align:center;font-family:inherit;cursor:pointer}
        .btn-act-free{background:#2ECC71;color:#0A0A0A}
        .btn-act-book{background:#F5E642;color:#0A0A0A}

        .fab{position:fixed;bottom:20px;right:16px;background:#F5E642;color:#0A0A0A;border:none;border-radius:30px;padding:13px 22px;font-family:inherit;font-weight:700;font-size:0.85rem;cursor:pointer;z-index:40;box-shadow:0 4px 24px rgba(245,230,66,0.4)}
        .fab:active{opacity:0.8}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:100;display:flex;align-items:flex-end;justify-content:center}
        .modal{background:#111;border-radius:20px 20px 0 0;padding:24px 20px 44px;width:100%;max-width:480px;border-top:1px solid #252525;max-height:92vh;overflow-y:auto}
        .modal-title{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:#F5E642;margin-bottom:4px;letter-spacing:1px}
        .modal-sub{font-size:0.78rem;color:#777;margin-bottom:16px}
        .btn-cancel{flex:1;background:transparent;color:#777;border:1px solid #252525;border-radius:8px;padding:12px;font-family:inherit;font-size:0.9rem;cursor:pointer}
        .btn-submit{flex:2;background:#F5E642;color:#0A0A0A;border:none;border-radius:8px;padding:12px;font-family:inherit;font-weight:700;font-size:0.9rem;cursor:pointer}
      `}</style>
    </>
  );
}

function EventCard({e,expanded,onToggle,delay=0}){
  const color = SOURCE_COLORS[e.source] || "#888";
  const priceClass = e.isFree ? "price-free" : e.price === "Various" ? "price-various" : "price-paid";
  const priceLabel = e.isFree ? "Free" : (e.price || "Paid");

  function share(ev){
    ev.stopPropagation();
    if(navigator.share) navigator.share({title:e.title, text:`${e.title} at ${e.venue}`, url:e.url||window.location.href});
  }

  function getButtonLabel() {
    if (e.source === "fallback") return "See Events →";
    if (e.isFree) return "More Info →";
    return "Get Tickets →";
  }

  return(
    <div className={`event-card${expanded?" expanded":""}`} onClick={onToggle} style={{animationDelay:`${delay}ms`}}>
      <div className="card-accent" style={{background:color}}/>
      {e.isLive&&<div className="live-badge">LIVE</div>}
      <div className="card-top">
        <div className="card-title" style={{paddingRight:e.isLive?40:0}}>{e.title}</div>
        <div className={`price-badge ${priceClass}`}>{priceLabel}</div>
      </div>
      <div className="card-meta">
        {e.time&&<span className="meta-item">🕐 {e.time}</span>}
        {e.venue&&<span className="meta-item">📍 {e.venue}{e.suburb&&e.suburb!==e.venue?`, ${e.suburb}`:""}</span>}
      </div>
      {e.tags?.filter(Boolean).length>0&&(
        <div className="card-tags">
          {e.tags.filter(Boolean).slice(0,3).map((t,i)=><span key={i} className="tag">{t}</span>)}
        </div>
      )}
      {expanded&&(
        <div className="card-expanded">
          {e.description&&<div className="card-desc">{e.description}</div>}
          {e.address&&e.address!==e.venue&&<div className="card-address">📌 {e.address}</div>}
          <div className="card-actions">
            {e.url&&(
              <a href={e.url} target="_blank" rel="noopener noreferrer" onClick={ev=>ev.stopPropagation()}
                className={`btn-ticket${e.isFree?" btn-free":""}`}>
                {getButtonLabel()}
              </a>
            )}
            <button onClick={share} className="btn-share">↗ Share</button>
          </div>
          <div className="card-source">
            <span className="source-dot" style={{background:color}}/>
            {e.source==="ticketmaster"?"Ticketmaster":e.source==="brisbanecouncil"?"Brisbane City Council":e.source==="community"?"Community submission":"Venue guide"}
          </div>
        </div>
      )}
    </div>
  );
}
