import { useState, useEffect } from "react";
import Head from "next/head";

const CAT_ICONS = { music:"🎵", arts:"🎨", food:"🍜", outdoors:"🥾", comedy:"😂", sports:"⚽", community:"🤝", nightlife:"🌙", family:"👨‍👩‍👧", other:"📌" };
const CAT_LABELS = { music:"Music", arts:"Arts & Culture", food:"Food & Drink", outdoors:"Outdoors", comedy:"Comedy", sports:"Sports", community:"Community", nightlife:"Nightlife", family:"Family", other:"Other" };
const FILTERS = ["all","music","nightlife","arts","comedy","food","community","outdoors","sports","family","free"];
const SOURCE_COLORS = { ticketmaster:"#026CDF", brisbanecouncil:"#FF9F1C", fallback:"#555", community:"#C77DFF" };

// ── CONFIRMED REAL BRISBANE VENUES (all URLs verified working) ────────────────
const VENUES = [
  // MUSIC
  { id:"v1", cat:"music", name:"The Triffid", suburb:"Newstead", type:"Live Music Venue", desc:"Brisbane's home of live music in a converted WW2 hangar. Intimate shows across multiple spaces with a great beer garden.", url:"https://www.thetriffid.com.au/whats-on" },
  { id:"v2", cat:"music", name:"Fortitude Music Hall", suburb:"Fortitude Valley", type:"Live Music Venue", desc:"Brisbane's grandest live music venue. Stunning heritage building hosting major national and international acts.", url:"https://www.thefortitude.com.au/whats-on" },
  { id:"v3", cat:"music", name:"The Tivoli", suburb:"Fortitude Valley", type:"Live Music Venue", desc:"Brisbane's original home of live music since 1989. Fiercely independent, locally owned and loved.", url:"https://thetivoli.com.au/events" },
  { id:"v4", cat:"music", name:"Crowbar Brisbane", suburb:"Fortitude Valley", type:"Live Music Bar", desc:"Punk, hardcore and metal dive bar at the old Zoo venue. Open plan, laid back, brilliant atmosphere.", url:"https://crowbarbris.oztix.com.au/" },
  { id:"v5", cat:"music", name:"Brisbane Powerhouse", suburb:"New Farm", type:"Arts & Music Venue", desc:"Queensland's home for contemporary culture. Theatre, comedy, music festivals and more in a stunning riverside venue.", url:"https://brisbanepowerhouse.org/events/" },
  { id:"v6", cat:"music", name:"QPAC", suburb:"South Brisbane", type:"Performing Arts Centre", desc:"Queensland's premier performing arts centre. Opera, ballet, theatre and major productions.", url:"https://qpac.com.au/whats-on" },
  // NIGHTLIFE
  { id:"v7", cat:"nightlife", name:"Cloudland", suburb:"Fortitude Valley", type:"Nightclub & Bar", desc:"Brisbane's most iconic nightclub. Multiple rooms, retractable roof garden, world-class DJs every weekend.", url:"https://www.cloudland.tv/" },
  { id:"v8", cat:"nightlife", name:"The Wickham Hotel", suburb:"Fortitude Valley", type:"LGBTQ+ Pub & Bar", desc:"Brisbane's iconic LGBTQ+ venue. Drag shows, DJ nights, rooftop bar and a welcoming crowd every night.", url:"https://thewickham.com.au/live-entertainment/" },
  { id:"v9", cat:"nightlife", name:"Black Bear Lodge", suburb:"Fortitude Valley", type:"Live Music Bar", desc:"Cosy, intimate bar with live music most nights. Great craft beer selection and friendly local vibe.", url:"https://www.facebook.com/blackbearlodge/" },
  { id:"v10", cat:"nightlife", name:"Woolly Mammoth Saloon", suburb:"Fortitude Valley", type:"Live Music Bar", desc:"Rock and metal bar with live music and DJ nights. Open late, great atmosphere.", url:"https://www.woollymammoth.com.au/" },
  // ARTS
  { id:"v11", cat:"arts", name:"GOMA", suburb:"South Brisbane", type:"Art Gallery", desc:"Gallery of Modern Art — world-class contemporary art. Free entry to permanent collection. Special exhibitions vary.", url:"https://www.qagoma.qld.gov.au/whats-on" },
  { id:"v12", cat:"arts", name:"Metro Arts", suburb:"Brisbane City", type:"Contemporary Arts Centre", desc:"Brisbane's home for independent contemporary arts. Exhibitions, performances and creative community events.", url:"https://www.metroarts.com.au/whats-on/" },
  // COMEDY
  { id:"v13", cat:"comedy", name:"Sit Down Comedy Club", suburb:"Fortitude Valley", type:"Comedy Club", desc:"Brisbane's dedicated stand-up comedy club. Weekly shows from local and touring national and international comedians.", url:"https://sitdowncomedy.com.au" },
  // FOOD
  { id:"v14", cat:"food", name:"West End Markets", suburb:"West End", type:"Weekend Market", desc:"Every Saturday 6am–2pm at Davies Park. 150+ vendors, fresh produce, street food, live music. Completely free entry.", url:"https://westendmarket.com.au" },
  { id:"v15", cat:"food", name:"Jan Powers Farmers Markets", suburb:"New Farm", type:"Farmers Market", desc:"Saturday mornings at Brisbane Powerhouse. Brisbane's best farmers market with artisan produce and amazing food stalls.", url:"https://janpowersfarmersmarkets.com.au" },
  { id:"v16", cat:"food", name:"Howard Smith Wharves", suburb:"Brisbane City", type:"Dining & Bar Precinct", desc:"Stunning riverside dining and bar precinct under the Story Bridge. Multiple restaurants, bars and event spaces.", url:"https://howardsmithwharves.com/eat-drink/" },
  // OUTDOORS
  { id:"v17", cat:"outdoors", name:"Parkrun Brisbane", suburb:"South Bank", type:"Free Weekly Run", desc:"Free 5km timed run every Saturday at 7am. All paces welcome — walk, jog or run. Register free at parkrun.com.au.", url:"https://www.parkrun.com.au/brisbane/" },
  { id:"v18", cat:"outdoors", name:"Riverlife Adventure Centre", suburb:"Kangaroo Point", type:"Outdoor Adventure", desc:"Kayaking, rock climbing, abseiling and cycling at Kangaroo Point Cliffs. Stunning river and city views.", url:"https://riverlife.com.au/activities/" },
  // COMMUNITY
  { id:"v19", cat:"community", name:"Brisbane Meetup Groups", suburb:"Various", type:"Social Meetups", desc:"Hundreds of Brisbane Meetup groups — hiking, language exchange, board games, tech, trivia, photography and more.", url:"https://www.meetup.com/find/au--brisbane/" },
  { id:"v20", cat:"community", name:"River City Labs", suburb:"Fortitude Valley", type:"Tech & Startup Hub", desc:"Brisbane's leading startup hub. Tech meetups, networking events, workshops and pitch nights.", url:"https://rivercitylabs.net/events/" },
];

function getDOW(s) { return new Date(s+"T12:00:00").toLocaleDateString("en-AU",{weekday:"long"}); }
function getFmt(s) { return new Date(s+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"}); }
function todayStr() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function App() {
  const [date, setDate] = useState(todayStr());
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("events"); // "events" | "venues"
  const [appStatus, setAppStatus] = useState("idle");
  const [meta, setMeta] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
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
      setEvents([...data.events,...comm]);
      setMeta(data.meta);
      setAppStatus("done");
    } catch(err) { setAppStatus("error"); }
  }

  function grouped() {
    const order=["music","nightlife","arts","comedy","food","community","outdoors","sports","family","other"];
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
                  {meta.sources.fallback>0&&<span className="pill fb">📍 {meta.sources.fallback} venue guide</span>}
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
                <div className="empty-title">No Events Found</div>
                <p className="empty-sub">No events found for this date. Try another date — or browse the Venue Guide for permanent Brisbane spots.</p>
                <button className="switch-btn" onClick={()=>setView("venues")}>🏢 Browse Venues →</button>
              </div>
            )}

            {/* EVENTS LIST */}
            {appStatus==="done"&&filtered.length>0&&(
              <div className="events-list">
                {filter!=="all"
                  ?filtered.map((e,i)=><EventCard key={e.id} e={e} expanded={expandedId===e.id} onToggle={()=>setExpandedId(expandedId===e.id?null:e.id)} delay={i*35}/>)
                  :grouped().map(({cat,evts})=>(
                    <div key={cat}>
                      <div className="section-header"><span>{CAT_ICONS[cat]} {CAT_LABELS[cat]}</span><div className="divider"/></div>
                      {evts.map((e,i)=><EventCard key={e.id} e={e} expanded={expandedId===e.id} onToggle={()=>setExpandedId(expandedId===e.id?null:e.id)} delay={i*35}/>)}
                    </div>
                  ))
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
        .section-header{display:flex;align-items:center;gap:8px;padding:16px 0 8px;font-size:0.58rem;text-transform:uppercase;letter-spacing:2px;color:#777}
        .divider{flex:1;height:1px;background:#252525}

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
