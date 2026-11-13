/* Case studies shown in the pop-up when a project in Featured work is opened.
   Each key matches the data-open-case attribute in index.html.
   A section body can be a paragraph (string) or a bullet list (array).
   Add nda: true to show the NDA note. */
window.CASES = {
  legrand: {
    eyebrow: 'Case study · Legrand Arteor · Saudi Arabia · 2025',
    title: 'A guided way to build the right switch plate',
    sub: 'How we turned a purchase-driven configurator into a specification tool for architects and dealers.',
    meta: [['Role', 'UX design'], ['Team', '2 designers, 1 PM, 3 developers'], ['Industry', 'Electrical products'], ['Year', '2025']],
    secs: [
      ['Context', 'Legrand wanted to bring its India switch configurator to Saudi Arabia. The Arteor configurator lets architects and dealers combine a plate, modules and a finish, and see the result before specifying it. But in Saudi Arabia there are no online sales, so the tool had to become something people configure with, not buy from.'],
      ['Challenge', 'In India the journey ended at "Shop online". Removing the cart left the journey without an ending. An audit of the existing tool showed formats mixed together, no grouping by ampere rating, a preview that didn\'t explain what changed, and e-commerce elements that made no sense in KSA.'],
      ['Research', ['A UX audit of the India configurator', 'Conversations with product, sales and support: misconfigurations were common and logic lived in people\'s heads', 'A look at IKEA (guidance), Schneider Electric (validation) and Aston Martin (accuracy)']],
      ['Insight', 'The product is complex. Using it shouldn\'t be. Every issue traced back to one cause: users had to discover the product\'s physical rules by trial and error.'],
      ['Strategy', ['Guidance: a linear flow, so the next step is always clear', 'Validation: instant feedback at the moment of each action', 'Accuracy: only configurations that can physically exist']],
      ['Solution', ['Built the way a plate is built: Form, then Function, then Finish', 'Square and Slender plates grow when a module won\'t fit, and the system places it for you', 'Hybrid layouts are fixed, so a short toast offers one way out: switch format', 'A new finish line: save the configuration, download the bill of materials, or export an image for clients']],
      ['Outcome', ['From an unstructured flow to a guided three-step journey', 'From little feedback to real-time validation', 'From dead ends to always a way forward', 'From ending at checkout to a useful output']],
      ['Learnings', ['UX must reflect real-world constraints', 'Preventive feedback beats corrective feedback', 'A clear path beats endless options', 'Every tool needs a strong end state']]
    ]
  },
  oman: {
    eyebrow: 'Case study · COMEX Oman 2025 · MTCIT × EvolutionCo',
    title: 'Oman Vision 2040, felt in under a minute',
    sub: 'A 200-page national plan, turned into a holographic story you can feel in under a minute.',
    meta: [['Role', 'UX/UI, content strategy, AI media'], ['Client', 'MTCIT, Oman'], ['Timeline', '1 week · 3 rounds'], ['Platform', 'Portrait holographic touch display']],
    secs: [
      ['Brief', '"Help us show, not just tell, how we\'re building Oman\'s future." A holographic touch installation for COMEX Oman 2025, the Sultanate\'s largest technology exhibition, designed by EvolutionCo with the Ministry of Transport, Communications and Information Technology.'],
      ['Problem', ['Dense policy: 200+ pages of framework', 'A loud hall: 60 seconds of booth time at most', 'About 5 seconds before a static display is ignored', 'Three audiences at once: leaders, youth and citizens']],
      ['Architecture', 'Five pillars renamed as actions, with three human stories each: 5 × 3 = 15. Small enough to choose, broad enough to cover the vision. Invest in People, Diversify Economy, Drive Transparency, Green Growth and Global Engagement.'],
      ['Iterations', ['Round 1, read: static info cards. Clean, but it felt like a corporate microsite, and dwell time stayed under 10 seconds', 'Round 2, read and listen: story cards, live data and podcasts. Credible, but nobody reads in a noisy hall', 'Round 3, tap and watch: a name, one line and a film. Depth moved into motion you can take in while standing in a crowd']],
      ['Interface', 'Learn one pillar, know all five: pillar tabs cut into the frame, a ghost title for depth on the hologram, a life-size Omani hero figure, a single coloured "Watch video" button, a story label and a three-story carousel with no dead ends.'],
      ['AI media', 'Fifteen films in five days, with NotebookLM for the narrative, ChatGPT for scenes, Sora for video, PixVerse for motion, and OpenArt and Envato for assets.'],
      ['Outcome', 'A national plan people could see, touch and feel. Shown at COMEX 2025 as MTCIT\'s flagship of digital transformation.'],
      ['Learnings', ['AI is a strategic accelerator, not a shortcut', 'Every extra line of text costs attention', 'Cultural authenticity builds trust', 'Clients are partners, not vendors']]
    ]
  }
};
