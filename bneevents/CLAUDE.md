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
- Dataset used: brisbane-city-council-events (master — includes all sub-categories)
- CRITICAL — Date filter uses UTC. Brisbane = UTC+10 (no daylight saving):
  - "2026-04-25" Brisbane = 2026-04-24T14:00:00Z to 2026-04-25T13:59:59Z
  - Code: subtract 10hrs from midnight Brisbane to get UTC start
- Key fields: subject (title), start_datetime (UTC), formatteddatetime (local readable),
  web_link (Trumba URL with eventid), bookings (HTML with external booking URL),
  event_type (array), primaryeventtype, cost, location, description, eventimage
- Direct event page URL format: brisbane.qld.gov.au/events/{slug}/{eventid}
  where eventid extracted from web_link via regex: /eventid(?:%3[Dd]|=)(\d+)/i

### CONFIRMED NOT WORKING (do not attempt again)
- Humanitix API — only returns organiser's own events
- Meetup API — requires paid Pro subscription since Feb 2025
- Moshtix — broken, historical data only
- Luma — requires paid subscription
- Eventbrite public search API — restricted

## BCC EVENT_TYPE CATEGORY MAP (all 18 official values)
music: ["music", "performing arts"]
arts: ["art", "creative", "exhibitions", "culture", "aboriginal and torres strait islander", "festivals"]
food: ["food", "markets"]
outdoors: ["fitness & well-being", "fitness and well-being", "green", "active and healthy"]
sports: ["sport", "sports"]
family: ["family events", "family", "children"]
community: ["tours", "workshops", "business"]
IGNORE: ["free", "featured"] — not real categories

## CONFIRMED WORKING VENUE URLS (verified in browser)
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
- West End Markets: https://westendmarket.com.au
- Jan Powers Markets: https://www.janpowersfarmersmarkets.com.au
- Howard Smith Wharves: https://howardsmithwharves.com/whats-on/
- Brisbane Meetup: https://www.meetup.com/find/au--brisbane/
- River City Labs: https://rivercitylabs.acs.org.au/go-virtual.html
- REMOVED: Woolly Mammoth Saloon — permanently closed March 2026

## CONFIRMED WORKING ACTIVITY URLS (verified in browser)
- Riverlife tours: https://riverlife.com.au/tours/
- Story Bridge Climb: https://storybridgeadventureclimb.com.au/activities/events/ (returns 403 server-side but works in browser — include as-is)
- XXXX Brewery Tour: https://www.xxxx.com.au/brewery-tours
- Moreton Island: https://www.tangalooma.com/day-cruise
- Australia Zoo: https://www.australiazoo.com.au
- Lone Pine Koala Sanctuary: https://lonepinekoalasanctuary.com
- North Stradbroke Island: https://www.stradbrokeisland.com
- Mt Coot-tha: https://www.brisbane.qld.gov.au/things-to-see-and-do/council-venues-and-precincts/mt-coot-tha-precinct
- Bunyaville Conservation Park: https://parks.des.qld.gov.au/parks/bunyaville-conservation-park

## CONFIRMED WORKING PARKRUN URLS
# Pattern: parkrun.com.au/{slug}/ — ALL verified via search results
# CRITICAL SLUGS — some differ from suburb name:
- southbank ✅
- newfarm ✅
- rocksriverside ✅
- sandgate ✅
- mitchelton ✅
- kelvingrove ✅ (not kelvin-grove)
- ashgrove ✅
- kedron ✅
- stonescorner ✅ (not stones-corner)
- stlucia ✅ (not st-lucia)
- minnippi ✅
- wynnum ✅
- chermside ✅
- mansfieldqld ✅ (NOT mansfield — 404s)
- forestlake ✅ (NOT forrestlake — 404s)
- calamvale ✅
- wishart ✅
- lota ✅
- pallara ✅
- zillmere ✅
- samfordparklands ✅

## ACTIVITIES TAB STRUCTURE
3 tabs: Events | Venues | Activities
Activities has 2 location toggles: Brisbane | Around Brisbane
Each location has collapsible subcategories (independent open/close)
Each subcat has collapsible activity TYPES within it
State persisted in localStorage — remembered across navigation

### Brisbane Activities
🏃 Fitness
  🏃 Run → 21 parkruns (all verified slugs above)
  🧘 Yoga & Pilates → BCC Active & Healthy: brisbane.qld.gov.au/parks-and-recreation/sports-and-leisure/active-and-healthy-activities
  💪 Group Fitness → same BCC page (boxing, Zumba, HIIT, aqua classes — all free)

🌊 Adventure
  🧗 Climbing & Abseiling → Riverlife: riverlife.com.au/tours/
  🚣 Water → Riverlife: riverlife.com.au/tours/
  🚵 Cycling → Riverlife bike hire: riverlife.com.au/tours/
  🏔️ Bridge Climb → storybridgeadventureclimb.com.au/activities/events/ (403 server-side, works in browser)

🍺 Experiences
  🍺 Brewery Tours → XXXX: xxxx.com.au/brewery-tours

### Around Brisbane Activities
🏖️ Day Trips
  Moreton Island → tangalooma.com/day-cruise
  Australia Zoo → australiazoo.com.au
  Lone Pine → lonepinekoalasanctuary.com
  North Stradbroke → stradbrokeisland.com

🌿 Nature
  Mt Coot-tha → brisbane.qld.gov.au/things-to-see-and-do/council-venues-and-precincts/mt-coot-tha-precinct
  Bunyaville → parks.des.qld.gov.au/parks/bunyaville-conservation-park

## KEY DECISIONS (do not reverse without discussion)
1. No fake/AI-generated events ever — empty state is better than fake
2. Fallback = 0 — if no real data, show "No events found" message
3. Single BCC dataset (master) — sub-datasets caused Vercel timeout on free tier
4. Cache-Control: no-store on API responses — prevents Vercel serving stale results
5. UTC date math for BCC: subtract 10hrs from midnight Brisbane to get UTC window
6. isEvening flag: 6pm or later (not 5pm)
7. Nightlife filter shows: category=nightlife OR (isEvening AND music/arts/comedy)
8. BCC category uses official event_type field first, keyword fallback second
9. Woolly Mammoth removed — permanently closed March 2026
10. App has 3 tabs: Events | Venues | Activities

## APP STRUCTURE
### Events Tab
- User picks date → hits Find → sees all events grouped by category
- Category filter chips narrow results (all, music, nightlife, arts, comedy, food, community, outdoors, sports, family, free)
- Empty date: "No Events Found" + Browse Venues button
- Empty filter: "No X events" + Show All button
- Sources shown as pills: Ticketmaster (blue), BCC (orange)

### Venues Tab
- 17 confirmed Brisbane venues with verified whats-on URLs
- Filter chips work here too (show venues by category)
- Button: "See What's On →"

### Activities Tab (being built)
- 3-level hierarchy: Tab → Location → Subcat → Activity type → Individual items
- Locations: Brisbane | Around Brisbane
- Subcategories are COLLAPSIBLE — user can open/close each independently
- Within each subcat, activity TYPES group items (e.g. Run > Parkrun, Marathon)
- Free activities: green button | Paid/book: yellow button
- Current Brisbane subcats: Fitness, Adventure, Experiences
- Current Around Brisbane subcats: Day Trips, Nature

## VERCEL SETUP
- Root directory: bneevents
- Framework: Next.js (via vercel.json)
- Env vars: TICKETMASTER_KEY
- Free tier: 10 second serverless function timeout — don't make more than 2 parallel API calls
- Logs: vercel.com/stephlar76s-projects/bne-events/logs

## HOW TO DEPLOY
1. Edit files in GitHub (bneevents/ subfolder)
2. Vercel auto-deploys on push to main
3. Check logs after deployment at Vercel dashboard
