Claro, aquí lo tienes completo:

Figma Prompt — "AccésBCN" (Barcelona Accessible Metro App)
PRODUCT BRIEF
Design a mobile-first web app called AccésBCN for wheelchair users and people with reduced mobility in Barcelona. The app answers one critical question instantly: "Can I physically get through this metro station right now?" — and then plans a fully step-free route across the TMB metro network.
This is not a generic transit app. Every design decision must assume the user may be holding the phone with one hand while pushing a wheelchair, may have limited fine motor control, and cannot afford to arrive at a station only to discover the elevator is broken.
THINK LIKE THREE PROFESSIONALS AT ONCE
As a UX designer: minimize interactions per task. The elevator status of the user's saved stations must be visible in under 2 seconds, with zero taps, on the home screen. Touch targets minimum 56×56 px. No gestures that require precision (no long-press, no pinch-only interactions — always provide button alternatives for zoom). High contrast, WCAG 2.2 AA minimum, AAA for critical status text.
As an engineer: structure screens around real data. TMB (Transports Metropolitans de Barcelona) publishes open data including elevator and escalator incident status per station. Design UI states for: live data, stale data ("last updated 4 min ago"), offline mode (cached last-known status with a clear warning banner), and unverified community reports. Every status card must show a timestamp and data source.
As an urban mobility planner: a broken elevator is not an inconvenience, it's a hard barrier. Routing logic must treat a non-working elevator as a closed station for this user. Routes must prefer fewer transfers even if slower, flag stations with long accessible-transfer corridors (e.g., Passeig de Gràcia), account for street-level obstacles near exits (steep streets, construction), and always compute a backup route in case an elevator fails mid-journey.
CORE FEATURES (design all of these)
1. Home — Status Dashboard

Greeting + "My stations" section: user-pinned stations shown as large status cards.
Each card: station name, line badges (L1–L11 with official TMB colors), one dominant status indicator using three states — expressed strictly within the reference palette (blues, lavender, ice white, near-black), never with green/amber/red traffic-light colors:

Operational — vivid solid blue (#2B5CE6) filled pill with a checkmark icon, label "All elevators working"
Maintenance — soft lavender/ice-blue gradient pill (#C9CFF7 → #E8ECFB) with dark text and a clock icon, label "Planned maintenance until [date]"
Out of service — near-black (#0E1220) filled pill with white text and a blocked/cross icon, label "Elevator down — avoid this station". This is the highest-contrast element on screen, mirroring the solid black "Use Jet AI" pill in the reference.


Because the palette is monochromatic-blue, status must NEVER rely on color alone: each state pairs a distinct fill treatment (solid blue / soft gradient / solid black) with a distinct icon shape and an explicit text label. This is actually stronger for colorblind users than a traffic-light system.
A persistent "Plan accessible route" primary button, full-width, pinned near the bottom thumb zone.

2. Interactive Metro Map (the centerpiece screen)

A simplified, schematic Barcelona metro map (based on the official TMB 2026 map): lines L1 red, L2 purple, L3 green, L4 yellow, L5 blue, L9/L10 orange/light blue, L11 light green, plus FGC and Tram shown desaturated as secondary context.
Every station is a tappable node whose ring treatment reflects live elevator status using the app palette, not traffic-light colors: solid blue ring = operational, soft lavender ring = maintenance, solid near-black ring with a cross glyph = out of service, thin light-gray ring = no elevator / not accessible. TMB line colors remain on the lines themselves; status lives only on the station nodes so the two systems never clash.
Filter chips above the map: "Fully accessible", "Elevator issues", "My lines", "Near me".
Tapping a station opens a bottom sheet (does not navigate away): station name, lines, list of elevators/escalators each with individual status, number of step-free exits, and a "Route from here / to here" pair of buttons.
Zoom controls as explicit + / − buttons, and a "recenter on me" button. Map must remain usable one-handed.

3. Accessible Route Planner

Origin / destination inputs with large fields, recent searches, and voice input button.
Results show 2–3 route options as cards, ranked by "accessibility confidence", not just speed:

Total time, number of transfers, and a step-by-step breakdown: "Enter via Exit 2 (Carrer Marina — flat entrance) → Elevator to platform (working, verified 3 min ago) → L2 direction Badalona, 4 stops → Transfer at Sagrada Família: 180 m accessible corridor, 2 elevators…"
Explicit warnings inline: "Avoid Exit 1 — stairs only", "Station X skipped: elevator out of service".
Each route card shows a small linear route diagram (line-colored segments with transfer dots).


A "Backup plan" collapsible section per route: what to do if an elevator fails en route.

4. Station Detail Page

Vertical cross-section style mini-diagram of the station: street level → mezzanine → platform, showing where each elevator and escalator sits and its live status.
Accessible exits listed with street names and surface conditions.
Incident history ("this elevator failed 3 times this month") to build trust.
"Report a problem" button → simple 3-tap community report flow (select elevator → select issue → submit). Community reports appear as "unverified" with a distinct visual treatment until confirmed.

5. Alerts & Notifications

Users subscribe to stations or saved routes; if an elevator on a saved route goes down, they get a push notification with a one-tap "Recalculate route" action.

VISUAL DESIGN DIRECTION (follow this precisely — no generic dashboard templates)
Reference aesthetic: modern, airy, premium SaaS design in the style of the attached reference — soft off-white background (#F5F6FA), generous whitespace, large rounded cards (24–28 px radius), subtle lavender-to-ice-blue gradients on hero surfaces, soft diffused shadows (no hard borders), and pill-shaped buttons.

Color system (taken directly from the reference image — no colors outside it): off-white base #F5F6FA; card white #FFFFFF; soft lavender-to-ice-blue gradients (#C9CFF7 → #E8ECFB) for hero surfaces and "maintenance" states; one vivid accent blue #2B5CE6 for primary actions and "operational" states; near-black #0E1220 for text, primary pills, and "out of service" states. No green, no amber, no red anywhere in the interface — hierarchy and urgency are communicated through fill contrast (solid black > solid blue > soft gradient > outline), icon shape, and typographic weight.
Typography: a clean geometric sans (Inter or General Sans). Oversized numerals and status words — status should be readable at arm's length, like the big "0%" treatment in the reference. Base body size 18 px minimum, status labels 24–32 px semibold.
Buttons: pill-shaped; primary = solid black or deep blue pill with white text; secondary = soft translucent pill on light gradient, exactly like the "Use Jet AI" / "Use templates" toggle pattern in the reference.
Cards: floating white cards over the soft background, with a single gradient hero card per screen (e.g., the "next elevator status" card can use the soft blue gradient treatment).
Iconography: thin-stroke geometric line icons only. Absolutely no emojis anywhere in the interface.
Motion: subtle — status changes animate with a gentle color transition, bottom sheets slide with spring easing. Respect "reduce motion" OS setting.
Tone: calm, precise, trustworthy. This app deals with people's physical safety and autonomy; the design should feel like medical-grade reliability wrapped in consumer polish.

ACCESSIBILITY REQUIREMENTS (non-negotiable)

WCAG 2.2 AA overall, AAA contrast on all status text.
Full screen-reader labeling on every interactive element; status announced as text, not color.
Everything reachable in the bottom 60% of the screen (thumb zone); no critical actions in top corners.
Text scaling support up to 200% without layout breakage.
Voice input on all search fields; optional high-contrast theme and large-type mode toggle in settings.
Offline-first: last-known statuses cached and clearly timestamped.

SCREENS TO PRODUCE

Onboarding (3 screens: value prop, choose mobility profile, pin home stations)
Home / Status Dashboard
Interactive Metro Map with station bottom sheet
Route Planner — input state
Route Planner — results with step-by-step accessible itinerary
Station Detail with vertical cross-section diagram
Route Planner — results with step-by-step accessible itinerary
Report a Problem flow
Alerts / Notifications settings
Empty, offline, and error states for the dashboard and map

Design mobile (390 px) as primary, with a tablet/desktop dashboard variant of the map screen for planning at home before leaving.