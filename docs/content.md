# Portfolio content plan: Aakansha Singh

> Source of truth for all copy on the site. Text in `[brackets]` is a placeholder
> for something still to collect or confirm; don't publish a page with brackets in it.

## The homepage concept: What's in my bag

> A tote bag sits on the floor. Tip it over, and everything I carry spills out.
> Each thing in it opens a part of me: my work, my story, my life outside work.

**Scope rule:** the bag is the **homepage only** (plus small touches on About and 404). Case studies use a clean, plain template. The only link back is a small icon of the item in the corner and "← Back to the bag."

## What's in the bag

### Project items

| Item | Why it's in my bag (tag, line 1) | Opens | Project line (tag, line 2) | Status on tag |
|---|---|---|---|---|
| **Smartwatch** | "Tracks every workout." | Trends · One Health Assist | "Tells patients in 5 seconds whether they're getting better." | In development |
| **Paperback** (your current read) | "Always one book in the bag." | Oman Vision 2040 · MTCIT | "200 pages of policy → a one-minute holographic experience." | Live at COMEX 2025 |
| **Keyring with clip-on charms** | "Too many charms. They all clip on." | Legrand Arteor configurator | "A configurator where every piece fits, or it won't let you add it." | Concept |
| **Handwritten recipe card** (with a flour smudge) | "Learning to bake. Following recipes, for now." | Prescription templates · One Health Assist | "One template, adapted for every specialist." | Prototype |
| **Resistance band** | "Workouts on the go." | Rep counter · One Health Assist | `[e.g. "Counts your reps so you can focus on form."]` | Prototype |

### Everything else

| Item | Opens | Tag |
|---|---|---|
| **Train pass / ID card** | About page | "Aakansha Singh · UX/UI Designer · Mumbai" |
| **Folded sheet of paper** | Résumé (PDF) | "The one-page version." |
| **Phone** (lock screen shows one unread message: "Say hi?") | Contact panel | "Say hi." |
| **Yoga mat** (rolled up, stays strapped to the bag) | Calm mode: turns off all motion and physics | "Breathe. Everything stays still." |

### Easter eggs

| Item | What happens |
|---|---|
| **Earphones** | "Now playing: `[song you dance to]`", optionally linking to your playlist |
| **Cookie wrapped in foil** | "Baking attempt #1: 6/10. Will iterate." |
| **Sunglasses** | Flips to a photo from your favourite trek, with `[trek name, altitude]` |
| **Swim goggles** | "Early lap, then work." |

## How it works

- **Load (~1.5 s):** bag upright, yoga mat strapped to the side, `TIP IT OVER` pulses; after ~3 s idle the bag wobbles once.
- **Tip (~1.2 s):** click, drag sideways, scroll (desktop) or tap/swipe (phone). Items spill with light physics and land in **preset end positions**.
- **Explore:** hover/focus lifts the item and swings in its paper tag (personal reason; project line + status). Click glides to centre and crossfades into the case study. Items can be dragged. "Pack it back" returns everything.
- **Fallbacks:** "Just show me the work" plain list; calm mode (yoga mat or reduced-motion) shows a still flat-lay; every item is a labelled button; Tab goes projects first; tags are real text; phone layout is portrait with the list always visible.

## Look and feel

| Token | Light | Dark (night bag) |
|---|---|---|
| Floor | Warm sand `#E8DCCB` | Deep plum `#1E1A22` |
| Bag | Canvas `#F3EEE6` with one stripe in the accent colour | Same, softly lit |
| Tag paper | `#FFFDF8` | `#2A2530` |
| Text | `#1D1B1A` | `#F1ECE6` |
| Accent | Terracotta `#D2643C` | Terracotta `#E07A52` |

Type: Inter (headings/body) · Caveat (tag line 1 only) · IBM Plex Mono (status/metadata). Motion: springy and soft, settle < 1.5 s, always skippable. Sound: optional, off by default.

### Photo shoot shot list
- [ ] Tote bag upright (front), plus a version with the yoga mat strapped on
- [ ] Tote bag tipped on its side, empty, opening facing the camera
- [ ] Smartwatch · paperback · keyring with charms · handwritten recipe card · resistance band
- [ ] Train pass/ID · folded paper · phone (lock screen edited later)
- [ ] Earphones · foil-wrapped cookie · sunglasses · swim goggles
- [ ] Same lighting, same height, same angle for every item. Shoot on a white or grey background.

## 1. Site map

```
/                      Home: the bag
/work/trends           Case study (password)
/work/oman-vision-2040 Case study
/work/legrand          Case study
/work/prescriptions    Case study (password, add after doctor test)
/work/rep-counter      Short case (password, add after prototype video)
/about                 About: the rest of the bag
/resume.pdf            Résumé
/protected             Password gate
/404                   Not found
```

### Home `/`
1. Header: name (home) · Work · About · Résumé · Contact · theme · sound
2. Hero: eyebrow "Aakansha Singh · UX/UI Designer · Mumbai"; headline **I make complicated things feel simple.**; line "Here's what I carry. Tip the bag to see my work."; link "Just show me the work ↓"
3. The bag
4. The work (plain list): name · client · one line · status
5. Footer: email, LinkedIn, Behance, "Mumbai · `[open to remote / relocation]`"

> **Agency version:** move the paperback (Oman) to the centre of the spill and to the top of the list.

### Case study page (same plain template for all five)
1. Hero: small item icon + "← Back to the bag"; title, hook, key visual; facts row (Role · Team · Timeline · Platform · Status)
2. 60-second summary card: Problem / What I did / Outcome
3. Problem
4. Process: 3–4 key decisions (problem → options → choice → visual with caption)
5. Outcome
6. What I learned (2 points)
7. Next project: next item's photo + "Next: `[project]` →"

**60-second rule:** keep everything above *Process* to about 150 words.

### About `/about`: the rest of the bag
1. Photo + the train pass/ID card as a design element
2. Intro: "I'm a UX/UI designer at One Health Assist in Mumbai." · "I like taking messy, rule-heavy problems and turning them into something people get at a glance." · "I'm looking for `[role / team you want]`."
3. Off the clock: Yoga `[what it gives you]` · Dance `[style]` · Trekking `[favourite trek]` · Swimming `[e.g. early laps]` · Reading `[current book]` · Baking "Just started. Expect bugs."
4. Experience: One Health Assist (current) · `[EvolutionCo, confirm]` · `[earlier roles]`
5. How I work: Find the rules first. · Show the answer before the number. · Design for the medium.
6. Toolkit: Figma, `[prototyping tools]`, NotebookLM, ChatGPT, Sora, PixVerse, `[others]`
7. Résumé download + contact

### Password gate `/protected`
- The empty bag with its zipped inner pocket.
- "This one's in the zipped pocket. The work is under NDA."
- "Email me for the password." mailto button with the subject line filled in.

### 404
- One lonely item on the floor (a hair clip). "Looks like this fell out of the bag." "Back to the bag" button.

## 2. Homepage copy

**Short intro:** I'm a UX/UI designer at One Health Assist, designing how patients and doctors make sense of clinical data. Before that, I turned a configurator full of compatibility rules into a guided tool for Legrand in Saudi Arabia, and a 200-page national plan into a one-minute holographic experience for Oman's ministry. Outside work, I'm usually at yoga, in a dance class, on a trail, or (lately) burning cookies.

| Spot | Copy |
|---|---|
| Prompt on the bag | `TIP IT OVER` |
| Skip link | "Just show me the work ↓" |
| Repack button | "Pack it back" |
| Calm mode (yoga mat) | "Breathe. Everything stays still." |
| Phone / contact panel | "Say hi." → email · LinkedIn · Behance |
| Case study back link | "← Back to the bag" |
| Next project | "Next: `[project]` →" |

## 3. Case study outlines

**OHA work:** get your company's okay before publishing, or put those pages behind the password.

### 3.1 OHA Trends (smartwatch) · In development
**Hook:** One screen that tells a patient in five seconds whether they're getting better, for any care program.
**Facts:** Role `[UX/UI Designer, sole designer? confirm]` · Team `[PM, clinical team, devs]` · Timeline `[X weeks]`, 2026 · Platform: patient mobile app · Status: In development
**60-second summary**
- **Problem:** Patients get a score out of 800 and a 100-marker lab report, then nothing that tells them whether it's working.
- **What I did:** Designed one module (10 screens, 13 flows) that works for every care program by changing settings, not screens.
- **Outcome:** `[e.g. "4 of 5 test users correctly said whether they were improving in under 5 seconds"]` · now being built.

**Problem**
- Data arrives at very different speeds: labs a few times a year, BP daily, glucose every few minutes.
- "Up" doesn't always mean good. A rising score is good news, rising BP isn't, and potassium has to stay in range.
- Bad news makes people quit, and health literacy varies. Some patients rely on a family member to use the app.
- There are 4 programs today and more coming, and some patients are in two at once.

**Process: 4 key decisions**
1. **Answer, then number.** Overview (*am I better?*) → Domain (*why did it move?*) → Metric (*what does this mean?*) → Action (*what can I do?*).
2. **Separate "what moved" from "is it good."** Arrows are neutral, and status words come from each metric's direction type, so rising BP never shows a green arrow.
3. **The chart follows how often data arrives.** Labs show as dated dots and get a line only after 3 results. Daily logs show a 7-day average. The score is a step line.
4. **No bad news without a next step.** When the score drops a zone: what changed, then why, then what to do, then the number. The Red zone has its own safety path: care team notified, book a doctor, no upsells. Zones use colour + shape + word (● ▲ ◆ ■).

*Side note:* one settings file per program, so a new program needs no new screens.

**Outcome:** `[5-second test results]` · `[Comprehension test: % who read "lower is better" charts correctly]` · `[Clinician quote]` · In development, `[expected launch]`
**What I learned:** In healthcare, the hardest UI decisions are about honesty: not drawing a trend that isn't there, and not hiding bad news. · Designing a system is what lets a product grow without the design work multiplying.
**Cut from the 34-page spec:** domain weights (clinical IP), plan pricing, notification table, manual inconsistencies, full flow diagrams (show one at most).

### 3.2 Oman Vision 2040 (paperback) · Live
**Hook:** In one week, I turned a 200-page national plan into a tap-and-watch holographic kiosk with 15 short films.
**Facts:** Role: UX/UI Designer, content strategy, AI media · Client: Ministry of Transport, Communications & IT (MTCIT), Oman · Agency: EvolutionCo · Timeline: 1-week sprint, 3 rounds · Platform: portrait touch holographic display · Status: Live at COMEX 2025
**60-second summary**
- **Problem:** Visitors give a booth 30–60 seconds, but Vision 2040 is hundreds of initiatives across dozens of sectors.
- **What I did:** Organised it into 5 pillars × 3 micro-stories, with one tap to a short AI-produced film for each story.
- **Outcome:** Live at COMEX 2025. 15 films made in 5 days instead of the usual 6–8 weeks. `[booth photo / visitor count / client quote]`

**Problem:** The source is dense policy, and the setting is a loud, crowded hall. There are three audiences who need different depth: decision-makers, young people and the general public.
**Process: 3 rounds, 1 week**
1. **Read:** modular info cards. They were clear, but felt like a corporate microsite. `[Reword the "<10s dwell time" claim unless it was measured.]`
2. **Read + listen:** live data, podcasts, imagery. More depth, but it still asked people to read or listen in a noisy hall.
3. **Tap + watch:** text cut to a name and one line, with the depth moved into film. Every pillar screen uses the same pattern, so learning one teaches all five. The coral "Watch Video" button is the only coloured element on screen.

**AI pipeline:** NotebookLM → ChatGPT + Sora → PixVerse / OpenArt / Envato, reviewed for cultural accuracy.
**Outcome:** Ran at COMEX 2025 for MTCIT. `[Photo of the installation running at the event, the most important missing asset]` · 15 films in 5 days instead of 6–8 weeks. · `[Visitor numbers, or a line from MTCIT/EvolutionCo]`
**What I learned:** In a physical space, every line of text costs attention. · Showing Omani identity in the visuals is what made it credible.
**Cut:** "Miller's 5±2" (Miller's number is 7±2), the long tool list, the partner-lockup detail.

### 3.3 Legrand Arteor configurator (keyring) · Concept
**Hook:** I redesigned Legrand's switch configurator for Saudi Arabia so it's impossible to build a plate that doesn't work.
**Facts:** Role `[confirm scope]` · Team `[confirm]` · Employer `[EvolutionCo? confirm]` · Timeline `[X weeks]`, 2025 · Platform: desktop web · Status: Designed, not launched `[reason, if shareable]`
**60-second summary**
- **Problem:** The India configurator was built for shopping, and it let users build invalid configurations with no feedback.
- **What I did:** Rebuilt the logic and flow into a guided Format → Switches → Colours tool that blocks invalid choices and ends in a BOM (the parts list).
- **Outcome:** `[Before/after test: e.g. "5 of 5 built a valid plate vs 2 of 5 on the old tool"]`

**Problem:** The audit found Square, Slender and Hybrid formats weren't separated; products weren't grouped by amperage or type; the preview was confusing; the e-commerce features didn't apply in KSA. Stakeholders said the same from three sides: Sales saw frequent misconfigurations; Support kept getting questions about incompatible modules; the product team's rules lived only in people's heads.
**Process: 3 key decisions**
1. **A linear flow instead of an open canvas:** Format → Switches & Functions → Finishes/Colours.
2. **Map the rules before drawing screens.** Square and Slender plates grow as modules are added (1M → 2M → 4M / 2×2M), and a prompt offers a bigger plate when a module won't fit.
3. **Prevent errors instead of correcting them.** Hybrid plates have fixed layouts, so when one is full the action is blocked and a toast offers "Switch Format."

**Outcome:** `[Before/after usability test: completion, invalid configs, time]` · `[Quote from Legrand product/sales team]` · Not launched `[reason]`. Say it plainly.
**What I learned:** Preventing an error beats fixing it after the user has made it. · A B2B tool still needs a satisfying finish: the BOM is the "checkout."
**Fixes from the Behance version:** fill or remove the large blank gap, show a zoomed-in crop of the user-journey diagram, replace the generic learnings.

### 3.4 OHA prescription templates (recipe card) · Prototype (publish after doctor test)
**Hook:** `[One generic prescription form, N specialties.]` I designed templates that fit how each specialist actually prescribes.
**Facts:** Role `[confirm]` · Team `[confirm]` · Timeline `[confirm]` · Platform `[web / tablet]` · Status: Prototype
**60-second summary:** Problem `[e.g. doctors need different fields per specialty, so one form slows them down]` · What I did `[A shared base template with specialty-specific sections for N specialties]` · Outcome `[e.g. "Doctors wrote the same prescription in X sec vs Y sec"]`
**Process: 3 decisions to document:** 1. What's shared vs what's specific to a specialty (diagram). 2. Speed for repeat prescribing `[favourites, defaults, previous Rx?]`. 3. Safety and readability `[dosage formats, patient-facing output?]`.
**Outcome:** `[Timed test with 3–5 OHA doctors: current form vs template]` · `[One doctor quote]`
**What I learned:** `[after the test]`

### 3.5 OHA rep counter (resistance band) · Prototype (short page)
**Hook:** `[e.g. "Counts your reps so you can focus on form, not on counting."]`
**Facts:** Role `[confirm]` · Platform `[mobile, camera-based? confirm]` · Status: Prototype
**The whole page:** Video (30–60 sec prototype recording) · Problem `[who uses it, and what's hard]` · 3 decisions with screenshots `[e.g. numbers readable from 2 m · per-rep audio/haptic feedback · what happens when tracking loses the user]` · Outcome `[3-person test: did they trust the count?]` · Learned `[1 line]`

> If this stays thin, merge it with Prescriptions into one page called "Smaller OHA work."

## Proof checklist (collect before publishing)
- [ ] OHA permission to show work, or a password for those pages
- [ ] Trends: high-fidelity screens T0, T2, zone-drop · 5-second test (5 users) · clinician quote
- [ ] Oman: photo or video of the installation running at COMEX · any client/agency feedback · reworded dwell-time claim
- [ ] Legrand: role and employer confirmed · before/after usability test (5 users) · reason it didn't launch (if shareable)
- [ ] Prescriptions: specialties list · timed test with 3–5 doctors · one quote
- [ ] Rep counter: 30–60 sec prototype video · quick 3-person test
- [ ] About: photo · six "off the clock" photos · experience timeline · résumé PDF
- [ ] Bag: photo shoot done (shot list above) · items cut out as PNGs · tag copy final
