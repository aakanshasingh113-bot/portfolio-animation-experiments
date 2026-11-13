/* Case studies shown in the pop-up when a work card is clicked.
   Each key matches a card's data-case attribute in index.html.
   A section body can be a paragraph (string) or a bullet list (array).
   Sample content: replace it with your own projects.
   nda: true shows a note in the pop-up that the details are under NDA. */
window.CASES = {
  checkout: {
    eyebrow: 'Case study · E-commerce · 2025',
    title: 'Checkout, rebuilt',
    sub: 'Rebuilt a five-step checkout into three for a grocery delivery app.',
    meta: [['Role', 'Lead designer'], ['Team', '1 PM, 4 engineers'], ['Timeline', '6 weeks'], ['Platform', 'Android, iOS']],
    secs: [
      ['Context', 'The app grew fast, but 41% of carts never reached payment. Checkout had five screens and had not been touched in two years.'],
      ['Problem', 'Funnel data showed most exits on the address and slot screens. In 8 user calls, people said they didn\'t know what came next and worried about delivery fees appearing late.'],
      ['Approach', ['Mapped every field against what the app already knew about the user', 'Merged address and slot into one screen with smart defaults', 'Showed the full fee breakdown on the cart, before checkout', 'Tested 3 prototypes with 6 users each before picking one']],
      ['Solution', 'A three-step checkout: review cart, confirm delivery, pay. Returning users skip straight to pay with their last address and slot pre-filled.'],
      ['Impact', ['Checkout drop-off down 18% in the first month', 'Average time to pay down from 74s to 41s', 'Fee-related support tickets down by a third']],
      ['Learnings', 'Defaults did more than any visual change. Next time I\'d instrument the funnel before the redesign, not after.']
    ]
  },
  kyc: {
    eyebrow: 'NDA project · Enterprise · 2024',
    title: 'Operations dashboard',
    sub: 'A confidential internal dashboard for complex operations and large-scale data.',
    nda: true,
    meta: [['Role', 'Product designer'], ['Team', 'PM, data, 6 engineers'], ['Timeline', '5 months'], ['Platform', 'Web']],
    secs: [
      ['Context', 'Operations teams tracked thousands of daily orders across five tools and a lot of spreadsheets.'],
      ['Problem', 'People spent the first hour of every shift stitching data together before they could act on any of it.'],
      ['Approach', ['Shadowed three shifts to map what people checked first', 'Grouped metrics by the decision they support, not by data source', 'Designed dense tables that still scan in five seconds']],
      ['Impact', ['Morning triage cut from about an hour to 15 minutes', 'Five tools replaced by one']]
    ]
  },
  system: {
    eyebrow: 'NDA project · Healthcare · 2025',
    title: 'Gen-AI platform',
    sub: 'An enterprise AI product designed under strict regulatory and NDA constraints.',
    nda: true,
    meta: [['Role', 'Product designer'], ['Team', '2 designers, ML, compliance'], ['Timeline', '6 months'], ['Platform', 'Web']],
    secs: [
      ['Context', 'A regulated healthcare team wanted AI help with document-heavy work, without losing trust or traceability.'],
      ['Problem', 'Early prototypes gave answers people could not check, so nobody used them for real decisions.'],
      ['Approach', ['Showed the source behind every AI answer, inline', 'Designed clear states for "not sure" and "can\'t answer"', 'Built a component set the team could reuse across AI features']],
      ['Impact', ['Pilot users relied on it for daily work within weeks', 'Component set reused in three later features']]
    ]
  },
  plugin: {
    eyebrow: 'Case study · Design systems · 2024',
    title: 'Design system',
    sub: 'From 41 button styles to 6, with a library four squads actually use.',
    meta: [['Role', 'Design system owner'], ['Team', '2 designers, 2 front-end'], ['Timeline', '4 months'], ['Platform', 'Web, mobile']],
    secs: [
      ['Context', 'Four squads shipped features independently, each with its own Figma file.'],
      ['Problem', 'A screen audit found 41 button styles, 17 greys and no shared spacing scale. Handoff meetings were mostly about pixel values.'],
      ['Approach', ['Audited 300+ live screens and grouped duplicates', 'Set an 8pt spacing scale and a semantic colour set', 'Paired with front-end to name tokens the same in Figma and code']],
      ['Solution', 'A Figma library of 120 components with usage notes, plus a token package engineers install.'],
      ['Impact', ['All 4 squads on the library within a quarter', 'Handoff questions down 35%', 'New screens built roughly twice as fast']],
      ['Learnings', 'Adoption came from office hours, not documentation. I\'d start those on week one.']
    ]
  }
};
