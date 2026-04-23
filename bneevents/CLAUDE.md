# BNE Events — Claude Context File
# Updated: 2026-04-23
# Purpose: Feed this to Claude at the start of every session to avoid back-and-forth

## PROJECT
- App: bne-events.vercel.app
- GitHub: github.com/Stephlar76/bne-events (branch: main, subfolder: bneevents/)
- Stack: Next.js 14, deployed on Vercel free tier
- No database — all data fetched live from APIs

## FILE STRUCTURE
bneevents/
  pages/
    index.js          — renders <App/> with ssr:false via dynamic import
    api/
      events.js       — server-side API aggregator
  components/
    App.js            — full client-side React app
  vercel.json
  package.json
  next.config.js
  CLAUDE.md           — this file

## CONFIRMED WORKING API SOURCES

### Ticketmaster Discovery API
- Env var: TICKETMASTER_KEY (set in Vercel)
- Endpoint: https://app.ticketmaster.com/discovery/v2/events.json
- Params: city=Brisbane, countryCode=AU
- Returns: major concerts, sports, ticketed shows

### Brisbane City Council Open Data (FREE, no key)
- Base: https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/
- Dataset: brisbane-city-council-events (master — includes all sub-categories)
- CRITICAL — Date filter uses UTC. Brisbane = UTC+10 (no daylight saving):
  - "2026-04-25" Brisbane = 2026-04-24T14:00:00Z to 2026-04-25T13:59:59Z
  - Code: subtract 10hrs from midnight Brisbane to get UTC start
- Key fields: subject (title), start_datetime (UTC), formatteddatetime (local readable),
  web_link (Trumba URL with eventid), bookings (HTML with external booking URL),
  event_type (array), primaryeventtype, cost, location, description, eventimage
- Direct event page URL: brisbane.qld.gov.au/events/{slug}/{eventid}
  where eventid extracted from web_link via: /eventid(?:%3[Dd]|=)(\d+)/i

### CONFIRMED NOT WORKING (do not attempt again)
- Humanitix API — only returns organiser's own events
- Meetup API — requires paid Pro subscription since Feb 2025
- Moshtix — broken, historical data only
- Luma — requires paid subscription
- Eventbrite public search API — restricted

## BCC TIME PARSING — CRITICAL
formatteddatetime has 3 patterns:
1. "Thursday, 23 April 2026, 10am - 2:30pm" → extract "10AM" ✅
2. "Friday, 24 April 2026, 9:30 - 10:30am"  → start has no am/pm → use UTC fallback ✅
3. "Friday, 24 April 2026"                   → date only = all-day event → return "" ✅
UTC fallback: new Date(start_datetime).toLocaleTimeString("en-AU", {timeZone:"Australia/Brisbane"})
NEVER show "12:00 am" — that means the fallback ran incorrectly

## BCC EVENT_TYPE CATEGORY MAP (all 18 official values)
Priority order matters — markets beats food if both present:
PRIORITY: markets > music > arts > comedy > sports > family > nightlife > outdoors > community > food

music:     ["music", "performing arts"]
arts:      ["art", "creative", "exhibitions", "culture", "aboriginal and torres strait islander", "festivals"]
markets:   ["markets"]  ← SEPARATE from food
food:      ["food"]     ← pure: restaurants, bars, food festivals ONLY
outdoors:  ["fitness & well-being", "fitness and well-being", "green", "active and healthy"]
sports:    ["sport", "sports"]
family:    ["family events", "family", "children"]
community: ["tours", "workshops", "business"]
IGNORE:    ["free", "featured"] — not real categories

## CATEGORIES (11 total including markets)
all, music, nightlife, arts, comedy, food, markets, community, outdoors, sports, family, free

## APP STRUCTURE — 3 TABS

### 📅 Events Tab
- User picks date → hits Find → sees all events grouped by collapsible category sections
- Category sections collapse/expand independently (tap header)
- Parkruns injected automatically on Saturdays (21 locations, all free)
- Filter chips narrow results across all categories
- Nightlife filter: category=nightlife OR (isEvening AND music/arts/comedy)
- isEvening = 6pm or later
- Empty date: "No Events Found" + Browse Venues button
- Empty filter: "No X events" + Show All button
- Sources shown as pills: 🔵 Ticketmaster | 🟠 BCC | 🟢 Parkrun

### 🏢 Venues Tab
- 17 confirmed Brisbane venues with verified whats-on URLs
- Filter chips work here too
- Button: "See What's On →"

### 🎯 Activities Tab
- 3-level collapsible hierarchy: Subcat → Type → Items
- State persisted in localStorage (remembered across navigation)
- Location toggle: Brisbane | Around Brisbane
- Free: green button | Book: yellow button

## CONFIRMED WORKING VENUE URLS
- The Triffid: https://www.thetriffid.com.au/whats-on
- Fortitude Music Hall: https://www.thefortitude.com.au/whats-on
- The Tivoli: https://thetivoli.com.au/events
- Crowbar Brisbane: https://crowbarbrisbane.com/tickets/
- Brisbane Powerhouse: https://brisbanepowerhouse.org/events/
- QPAC: https://www.qpac.com.au/whats-on
- Cloudland: https://www.cloudland.tv/whats-on-cloudland/
- The Wickham: https://thewickham.com.au/live-entertainment/
- Black Bear Lodge: https://blackbearlodge.bar/events
- GOMA: https://www.qagoma.qld.gov.au/whats-on/
- Metro Arts: https://metroarts.com.au/whats-on/
- Sit Down Comedy Club: https://www.standup.com.au
- West End Markets: https://westendmarket.com.au (cat: markets)
- Jan Powers Markets: https://www.janpowersfarmersmarkets.com.au (cat: markets)
- Howard Smith Wharves: https://howardsmithwharves.com/whats-on/
- Brisbane Meetup: https://www.meetup.com/find/au--brisbane/
- River City Labs: https://rivercitylabs.acs.org.au/go-virtual.html
- REMOVED: Woolly Mammoth Saloon — permanently closed March 2026

## CONFIRMED WORKING ACTIVITY URLS
- Riverlife tours: https://riverlife.com.au/tours/
- Story Bridge Climb: https://storybridgeadventureclimb.com.au/activities/events/
  (returns 403 server-side but works fine in browser — include as-is)
- XXXX Brewery Tour: https://www.xxxx.com.au/brewery-tours
- Moreton Island: https://www.tangalooma.com/day-cruise
- Australia Zoo: https://www.australiazoo.com.au
- Lone Pine Koala Sanctuary: https://lonepinekoalasanctuary.com
- North Stradbroke Island: https://www.stradbrokeisland.com
- Mt Coot-tha: https://www.brisbane.qld.gov.au/things-to-see-and-do/council-venues-and-precincts/mt-coot-tha-precinct
- Bunyaville Conservation Park: https://parks.des.qld.gov.au/parks/bunyaville-conservation-park
- BCC Active & Healthy (yoga, fitness): https://www.brisbane.qld.gov.au/parks-and-recreation/sports-and-leisure/active-and-healthy-activities

## CONFIRMED WORKING PARKRUN SLUGS
# All at parkrun.com.au/{slug}/ — verified correct slugs:
southbank, newfarm, rocksriverside, sandgate, mitchelton, kelvingrove,
ashgrove, kedron, stonescorner, stlucia, minnippi, wynnum, chermside,
mansfieldqld (NOT mansfield), forestlake (NOT forrestlake),
calamvale, wishart, lota, pallara, zillmere, samfordparklands
# Parkruns inject into Events feed automatically on Saturdays

## KEY DECISIONS (do not reverse without discussion)
1. No fake/AI-generated events ever — empty state is better than fake
2. No fallback venue cards in events feed — if no real data show empty state
3. Single BCC dataset (master) — sub-datasets caused Vercel timeout on free tier
4. Cache-Control: no-store on API responses
5. UTC date math: subtract 10hrs from midnight Brisbane to get UTC window
6. isEvening = 6pm or later
7. Nightlife filter = nightlife category OR (isEvening AND music/arts/comedy)
8. BCC category uses official event_type field first, keyword fallback second
9. Markets is a SEPARATE category from Food — priority map ensures markets wins over food
10. All-day events (no time in formatteddatetime) show empty time string, not "12:00 am"
11. Woolly Mammoth removed — permanently closed March 2026
12. App has 3 tabs: Events | Venues | Activities
13. React Rules of Hooks: all useState at top, all useEffect next, functions last
14. Use plain arrays not Sets for React state (SSR safe)
15. Parkruns injected client-side on Saturdays from ACTIVITIES data

## REACT RULES — CRITICAL (caused crashes before)
- ALL useState hooks must come BEFORE any function declarations inside component
- ALL useEffect hooks after useState, before functions
- NEVER use Set/Map directly in useState — use plain arrays (SSR crashes otherwise)
- NEVER access localStorage during useState initialisation — use useEffect instead

## VERCEL SETUP
- Root directory: bneevents
- Framework: Next.js (via vercel.json)
- Env vars: TICKETMASTER_KEY
- Free tier: 10 second serverless timeout — max 2 parallel API calls
- Logs: vercel.com/stephlar76s-projects/bne-events/logs

## NEXT SESSION PRIORITIES
1. More event sources — nightlife, bars, trivia nights (biggest gap)
2. Custom domain
3. Share on r/brisbane
4. Add more Activities (hiking trails, swimming, more experiences)
