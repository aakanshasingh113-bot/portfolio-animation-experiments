/* Case studies. Each one has its own detail page (case-<key>.html), rendered
   from this data by assets/js/case.js.
   Section format: [label, body, figure?]
     body   – a paragraph (string) or a bullet list (array)
     figure – optional { img, cap } shown under the text
   Sections labelled "Insight" or "Brief" are shown as a large pull quote.
   Add nda: true to show the NDA note. */
window.CASES = {
  legrand: {
    page: 'case-legrand.html',
    color: '#D9332B',
    eyebrow: 'Legrand Arteor · Saudi Arabia · 2025',
    title: 'A guided way to build the right switch plate',
    sub: 'How we turned a purchase-driven configurator into a specification tool for architects and dealers.',
    tags: ['Configurator', 'B2B', 'UX design'],
    hero: { img: 'assets/work/legrand.webp', bg: 'radial-gradient(120% 90% at 30% 20%, #FBEDEC, #F1DCDA)', framed: true },
    meta: [['Role', 'UX design'], ['Team', '2 designers, 1 PM, 3 developers'], ['Industry', 'Electrical products'], ['Year', '2025']],
    secs: [
      ['Context', 'Legrand wanted to bring its India switch configurator to Saudi Arabia. The Arteor configurator lets architects and dealers combine a plate, modules and a finish, and see the result before specifying it. But in Saudi Arabia there are no online sales, so the tool had to become something people configure with, not buy from.'],
      ['Challenge', 'In India the journey ended at "Shop online". Removing the cart left the journey without an ending.',
        { img: 'assets/work/legrand/challenge.webp', cap: 'The India configurator: the journey ended at Shop online.' }],
      ['Audit', ['Square, Slender and Hybrid formats mixed together', 'No grouping by ampere rating or product type', 'A preview that didn\'t explain what changed', 'E-commerce elements irrelevant to KSA'],
        { img: 'assets/work/legrand/audit.webp', cap: 'UX audit of the existing tool.' }],
      ['Insight', 'The product is complex. Using it shouldn\'t be. Every issue traced back to one cause: users had to discover the product\'s physical rules by trial and error.'],
      ['Strategy', ['Guidance: a linear flow, so the next step is always clear', 'Validation: instant feedback at the moment of each action', 'Accuracy: only configurations that can physically exist']],
      ['Solution', ['Built the way a plate is built: Form, then Function, then Finish', 'Square and Slender plates grow when a module won\'t fit, and the system places it for you', 'Hybrid layouts are fixed, so a short toast offers one way out: switch format', 'A new finish line: save the configuration, download the bill of materials, or export an image for clients'],
        { img: 'assets/work/legrand/toast.webp', cap: 'When a hybrid layout is full, a toast offers one way out.' }],
      ['Logic first', 'Wireframes settled structure, behaviour and validation states before any visual design.',
        { img: 'assets/work/legrand/wire.webp', cap: 'Mid-fidelity wireframe to final UI.' }],
      ['Outcome', ['From an unstructured flow to a guided three-step journey', 'From little feedback to real-time validation', 'From dead ends to always a way forward', 'From ending at checkout to a useful output']],
      ['Learnings', ['UX must reflect real-world constraints', 'Preventive feedback beats corrective feedback', 'A clear path beats endless options', 'Every tool needs a strong end state']]
    ],
    next: 'oman'
  },
  oman: {
    page: 'case-oman.html',
    color: '#E0566B',
    eyebrow: 'COMEX Oman 2025 · MTCIT × EvolutionCo',
    title: 'Oman Vision 2040, felt in under a minute',
    sub: 'A 200-page national plan, turned into a holographic story you can feel in under a minute.',
    tags: ['Holographic touch', 'AI media', 'Exhibition'],
    hero: { img: 'assets/work/oman.webp', bg: '#160E10' },
    meta: [['Role', 'UX/UI, content strategy, AI media'], ['Client', 'MTCIT, Oman'], ['Timeline', '1 week · 3 rounds'], ['Platform', 'Portrait holographic touch display']],
    secs: [
      ['Brief', '"Help us show, not just tell, how we\'re building Oman\'s future."'],
      ['Context', 'A holographic touch installation for COMEX Oman 2025, the Sultanate\'s largest technology exhibition, designed by EvolutionCo with the Ministry of Transport, Communications and Information Technology.'],
      ['Problem', ['Dense policy: 200+ pages of framework', 'A loud hall: 60 seconds of booth time at most', 'About 5 seconds before a static display is ignored', 'Three audiences at once: leaders, youth and citizens'],
        { img: 'assets/work/oman/problem.webp', cap: 'Dense policy. A loud hall. Less than a minute.' }],
      ['Architecture', 'Five pillars renamed as actions, with three human stories each: 5 × 3 = 15. Small enough to choose, broad enough to cover the vision.',
        { img: 'assets/work/oman/ia.webp', cap: 'Five pillars, fifteen stories.' }],
      ['Iterations', ['Round 1, read: static info cards. Clean, but it felt like a corporate microsite, and dwell time stayed under 10 seconds', 'Round 2, read and listen: story cards, live data and podcasts. Credible, but nobody reads in a noisy hall', 'Round 3, tap and watch: a name, one line and a film. Depth moved into motion you can take in while standing in a crowd'],
        { img: 'assets/work/oman/iter.webp', cap: 'Read → Listen → Watch.' }],
      ['Interface', 'Learn one pillar, know all five: pillar tabs cut into the frame, a ghost title for depth on the hologram, a life-size Omani hero figure, a single coloured "Watch video" button, a story label and a three-story carousel with no dead ends.',
        { img: 'assets/work/oman/anatomy.webp', cap: 'Anatomy of a screen.' }],
      ['AI media', 'Fifteen films in five days, with NotebookLM for the narrative, ChatGPT for scenes, Sora for video, PixVerse for motion, and OpenArt and Envato for assets.'],
      ['Outcome', 'A national plan people could see, touch and feel. Shown at COMEX 2025 as MTCIT\'s flagship of digital transformation.',
        { img: 'assets/work/oman/outcome.webp', cap: 'Live on the holographic display at COMEX 2025.' }],
      ['Learnings', ['AI is a strategic accelerator, not a shortcut', 'Every extra line of text costs attention', 'Cultural authenticity builds trust', 'Clients are partners, not vendors']]
    ],
    next: 'legrand'
  }
};
