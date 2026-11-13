/* Case studies shown in the pop-up when a work card is clicked.
   Each key matches a card's data-case attribute in index.html.
   A section body can be a paragraph (string) or a bullet list (array).
   Sample content: replace it with your own projects. */
window.CASES = {
  checkout: {
    eyebrow: 'Case study · E-commerce · 2025',
    title: 'Cut checkout drop-off by 18%',
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
    eyebrow: 'Case study · Fintech · 2024',
    title: 'KYC in 4 minutes, down from 11',
    sub: 'Reordered onboarding around what users have in hand.',
    meta: [['Role', 'Product designer'], ['Team', '2 PMs, compliance, 5 engineers'], ['Timeline', '10 weeks'], ['Platform', 'Android']],
    secs: [
      ['Context', 'A lending app where every new user must complete KYC before seeing an offer.'],
      ['Problem', 'Users were asked for PAN, then a selfie, then Aadhaar, then income proof, often leaving to find documents and never coming back.'],
      ['Approach', ['Asked users upfront what they had on them', 'Ran document checks live instead of via a 24-hour review', 'Worked with compliance to drop one redundant step']],
      ['Solution', 'A checklist-first flow with live validation and a visible progress ring.'],
      ['Impact', ['Median time from 11 to 4 minutes', 'Completion up 22%', 'KYC support tickets down 30%']],
      ['Learnings', 'Compliance became an ally once they saw the drop-off data. I bring them in on day one now.']
    ]
  },
  system: {
    eyebrow: 'Case study · Design systems · 2024',
    title: 'A design system four squads actually use',
    sub: 'From 41 button styles to 6, with matching code tokens.',
    meta: [['Role', 'Design system owner'], ['Team', '2 designers, 2 front-end'], ['Timeline', '4 months'], ['Platform', 'Web, mobile']],
    secs: [
      ['Context', 'Four squads shipped features independently, each with its own Figma file.'],
      ['Problem', 'A screen audit found 41 button styles, 17 greys and no shared spacing scale. Handoff meetings were mostly about pixel values.'],
      ['Approach', ['Audited 300+ live screens and grouped duplicates', 'Set an 8pt spacing scale and a semantic colour set', 'Paired with front-end to name tokens the same in Figma and code']],
      ['Solution', 'A Figma library of 120 components with usage notes, plus a token package engineers install.'],
      ['Impact', ['All 4 squads on the library within a quarter', 'Handoff questions down 35%', 'New screens built roughly twice as fast']],
      ['Learnings', 'Adoption came from office hours, not documentation. I\'d start those on week one.']
    ]
  },
  plugin: {
    eyebrow: 'Experiment · AI · 2026',
    title: 'A Figma plugin that snaps spacing to the grid',
    sub: 'Built with Claude in a weekend.',
    meta: [['Role', 'Designer and builder'], ['Team', 'Just me (and Claude)'], ['Timeline', '2 days'], ['Tools', 'Figma API, Claude']],
    secs: [
      ['Why', 'In reviews I kept fixing 13px and 22px gaps by hand. I wanted a button that did it.'],
      ['How', 'I described the behaviour to Claude, tested each version on real files, and iterated on edge cases like auto-layout and nested frames.'],
      ['Result', 'A plugin that finds off-grid spacing and fixes it in one click. Nine teammates use it weekly.'],
      ['Learnings', 'Building it taught me more about auto-layout than three years of using it.']
    ]
  }
};
