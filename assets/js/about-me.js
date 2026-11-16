/* ============================================================
   EVERYTHING THE CHATBOT KNOWS ABOUT YOU.
   The chatbot answers only from this file (plus the case studies
   in cases.js). Edit freely: add facts, fix placeholders, add
   FAQs. Anything not written here, it will say it doesn't know.
   ============================================================ */
window.ABOUT_ME = {
  name: 'Aakansha Singh',
  email: 'you@youremail.com',          // ← replace with your real email
  facts: `
Aakansha Singh is a product designer with about three years of experience.
She is open to product design roles and the occasional freelance project, and usually replies within a day.
She works across UX and UI: research synthesis, flows, information architecture, wireframes, prototyping, UI design, design systems and handoff.
She uses AI as an accelerator in her process: ChatGPT and Perplexity for quick research and pattern scans, Claude for stress-testing flows and edge cases, Figma AI, Figma Make and Claude for rapid concepts, Cursor for coded prototypes, and Sora, PixVerse, OpenArt and NotebookLM for AI media.
Tools: Figma, FigJam, Protopie, Rive, Maze, Notion, HTML & CSS, Claude.

Her design process (fast and realistic, built for real deadlines, with AI at every step; no time-heavy user interviews):
1. Decode the brief – kickoff with PM and engineering: goal, constraints and deadline. AI turns the PRD and notes into a problem statement and open questions (the reason she built Brief Decoder).
2. Audit & benchmark – a quick heuristic review of the current product, existing analytics, and how the best products solve the same pattern. Perplexity and ChatGPT speed up pattern scans; she checks every claim.
3. Map flows & edge cases – user flows, IA and every state: empty, loading, error. Claude stress-tests flows for missed edge cases.
4. Explore wide, then converge – two or three rough directions reviewed early with PM and devs, then one chosen on purpose. Figma Make and Claude turn prompts into rough clickable concepts.
5. Design, prototype, critique – hi-fi UI, clickable prototype and a design crit. Figma AI renames layers, replaces placeholder content and makes prototype links; she edits all microcopy.
6. Hand off, QA, learn – specs, developer walkthroughs, design QA on real builds, then watching the metric after launch to plan v2. Cursor helps with coded prototypes of tricky interactions.

Design beliefs: the product can be complex but using it shouldn't be; preventive feedback beats corrective feedback; every tool needs a strong end state; every extra line of text costs attention; AI is a strategic accelerator, not a shortcut.

Experience (company names still to be added):
- 2024 – now: Product Designer at [Company] – checkout, payments and the design system.
- 2023 – 24: UI/UX Designer at [Company] – onboarding and KYC for a lending app.
- 2022 – 23: Design Intern at [Studio] – websites and brand work for early-stage startups.

Featured AI product: Brief Decoder (2026), an AI tool Aakansha designed and built herself. It separates what a design brief actually says from what still needs a conversation, reading a brief through six lenses: Stated, Unclear, Missing, Assumptions, Conflicts and Questions (one ranked list for the stakeholder). Every stated requirement shows the exact source quote from the brief; quotes that can't be matched are flagged as unverified; plausible assumptions stay out until the designer confirms, rejects or edits them; nothing is invented; instructions hidden inside a pasted brief are ignored; and there is no database or tracking. It ends with an editable working brief to copy or download, and works on mobile with Brief and Analysis as tabs. Built with Claude Code, Next.js, Gemini and Vercel. Learnings: design for uncertainty, trust is traceability, and states are the product. Live demo: https://portfolio-animations-experiments.vercel.app/ and the case study is in the AI experiments section.

AI experiments: AI-generated brand posters (Butterday breakfast, Slowleaf plant bowls, Bun Club "Big Crunch", a retro Vada Pav Mumbai travel poster) and small games built with AI: Snakes & Ladders, Pen Fight (a school-desk flicking game) and Keys That Sing (a typing pad where every key plays a note).

Outside design: baking (recipes are just specs, current project is the perfect croissant), yoga, café sketching, street food (pani puri above all, extra teekha) and long walks with lo-fi music.
`,
  /* Quick answers used when Claude isn't available (e.g. the downloaded copy).
     Each entry: words to match, and the answer. */
  faq: [
    { k: ['hire', 'available', 'open', 'role', 'job', 'freelance', 'looking'], a: 'Yes. Aakansha is open to product design roles and the occasional freelance project. The best way to reach her is email at {email}; she usually replies within a day.' },
    { k: ['contact', 'email', 'reach', 'talk', 'mail'], a: 'You can email Aakansha at {email}. She usually replies within a day.' },
    { k: ['legrand', 'switch', 'configurator', 'arteor', 'saudi'], a: 'For Legrand, Aakansha turned a purchase-driven switch configurator into a specification tool for architects and dealers in Saudi Arabia, where there is no online checkout. The flow became a guided Form → Function → Finish journey with real-time validation, and it ends with save, a bill of materials or an image export. Open the case study for the full story.' },
    { k: ['oman', 'vision', '2040', 'holographic', 'comex', 'mtcit'], a: 'Oman Vision 2040 was a one-week sprint for COMEX 2025: a 200-page national plan turned into a holographic touch story you can feel in under a minute. Five pillars, three human stories each, and 15 AI films made in five days. It went through three rounds: read, then listen, then watch.' },
    { k: ['process', 'approach', 'how do you work', 'workflow', 'method'], a: 'Her process: decode the brief, audit and reference, map flows and edge cases, explore fast with rough wireframes, design and prototype with reviews, then hand off, QA and iterate. AI speeds up every step, from research scans to rapid concepts and coded prototypes.' },
    { k: ['ai', 'chatgpt', 'claude', 'figma make', 'tools', 'sora'], a: 'Aakansha uses AI as an accelerator, not a shortcut: ChatGPT and Perplexity for quick research, Claude for stress-testing flows, Figma AI, Figma Make and Claude for fast concepts, Cursor for coded prototypes, and Sora, PixVerse and OpenArt for media. Her day-to-day tools are Figma, FigJam, Protopie, Rive, Maze and Notion.' },
    { k: ['experience', 'years', 'background', 'worked', 'company', 'career'], a: 'Aakansha has about three years of product design experience: currently a Product Designer working on checkout, payments and a design system; before that a UI/UX Designer on onboarding and KYC for a lending app; and she started as a design intern doing websites and brand work.' },
    { k: ['skill', 'strength', 'good at', 'specialise', 'specialize'], a: 'Her strengths are untangling complex flows, mapping logic and edge cases before visuals, design systems, and moving fast with AI-assisted prototyping.' },
    { k: ['hobby', 'hobbies', 'free time', 'fun', 'outside', 'weekend'], a: 'Outside design: baking (currently chasing the perfect croissant), yoga, café sketching, pani puri hunts and long walks with lo-fi music.' },
    { k: ['brief decoder', 'decoder', 'brief', 'tool', 'built', 'build', 'vibe', 'code'], a: 'Brief Decoder is an AI tool Aakansha designed and built (Claude Code, Next.js, Gemini, Vercel). It reads a design brief through six lenses (stated, unclear, missing, assumptions, conflicts and questions), shows the exact source quote for every requirement, and never invents what isn\'t there. You can try it live or read the case study in the AI experiments section.' },
    { k: ['experiment', 'game', 'poster', 'side project'], a: 'Her AI experiments include brand posters (Butterday, Slowleaf, Bun Club, Vada Pav) and games built with AI: Snakes & Ladders, Pen Fight and Keys That Sing. You can play them in the AI experiments section.' }
  ],
  suggestions: ['Is she open to new roles?', 'What is Brief Decoder?', 'How does she use AI in design?', 'What is her design process?']
};
