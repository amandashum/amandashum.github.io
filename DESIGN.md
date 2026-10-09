# DOS-inspired portfolio design

## Visual system

Use `#0c0e12` for the page, `#10131a` for terminal surfaces, `#efeee8` for primary text, `#a3a8b5` for secondary text, and `#7198ff` for blue details. Filled CTAs use `#3a67f5` with white text. Green marks readiness only. All design tokens are in `styles.css`.

Local monospace fallbacks avoid an external font dependency. Bold editorial headings, generous space, thin rules, flat surfaces, and square corners keep the DOS references readable and professional. Window title bars, paths, and file labels are framing devices rather than mandatory interactions.

## Hero and project connection

The hero uses a full-width cobalt-blue screen inspired by Amanda’s IBM startup reference. The clean headline and CTAs sit beside a personalized eight-stripe AMANDA wordmark, compact system text, and a short boot log. The striped SVG and log are decorative; the containing group names computer vision, Azure AI/RAG, developer tools, and leadership. All four startup status lines align their readiness text in the same column. Static headline, introduction, and links appear immediately.

The boot-screen identity reads “Amanda Shum”. The square navigation mark uses striped AS initials, supplied as a local SVG to match the hero lettering.

The startup loops automatically. Status lines type at 38ms per character, briefly show a DOS spinner (`| / - \\`) while loading, then resolve to ready. “Portfolio loaded.” precedes a typed command prompt and a small caret blinking every 1.1 seconds. The completed screen stays visible for one minute before the sequence repeats. Returning from an offscreen or background state preserves the remaining hold time. There are no replay or pause buttons.

The loop pauses offscreen and in background tabs. Reduced motion, unavailable visibility observers, and JavaScript-disabled visitors get a complete static display. Reserved line space prevents typing, spinner updates, and restart from changing layout. No continuous rendering loop or startup overlay is used. The cobalt hero ends at a sharp, thin blue rule; the aligned vertical connector continues into Projects against the dark DOS background.

The impact strip starts a flip sequence between the existing applied-work set and the three academic-project highlights every seven seconds. Three pairs of faces share compact rectangular cells and turn one after another from left to right. Values sit beside their captions on desktop and tablet, with a vertical arrangement on phones. The original text sizes and tight caption spacing keep each description together beside its value. An additional 48px of cobalt space separates the strip from the hero content above. Shared face heights and metric line boxes keep values aligned across both sets when captions wrap. Each horizontal-axis turn lasts 1.1 seconds, with the next cell delayed by that duration; the whole sequence takes 3.3 seconds without changing layout. A temporary shadow adds depth during each turn and clears when the sequence finishes. Fruit classification shows 96%, pothole analysis names YOLOv8/MiDaS, and Gridworld shows 85% coverage success. No pothole accuracy is invented. Offscreen/background states stop rotation. Reduced motion, unavailable observers, and no-JavaScript mode show all six facts statically. A static accessible list exposes all six facts without repeated live announcements.

All six project cards preserve their content and terminal-window format. Each uses the same native “Project details” disclosure, initially collapsed, to shorten both rows. Disclosures open and close independently; multiple projects remain open until the visitor closes each one. Grid items align at the top so closed cards keep their own height when a neighbour opens. Full Problem / Action / Result content, tags, and notes retain the same styles when expanded. Branch stems start inside a 32px row gutter and meet a horizontal rule rather than entering the preceding windows.

The 96% figure applies only to fruit classification; MiDaS depth is relative rather than metric. The 85% Gridworld figure is area-coverage success. Section headings use plain names: Projects, About, Experience, Skills, and Contact.

The cobalt hero ends directly below the highlights, without an extra bottom extension. Highlight cells use 18px of vertical padding. The build gives the stylesheet a content-based cache version so rebuilt style changes reach returning browsers. During normal scrolling, the blue connector draws downward and the Projects heading settles upward by at most 14px with a small opacity change. The reveal follows scroll position in either direction and completes as the section reaches the upper half of the viewport. Keyboard navigation and reduced motion use the static presentation. IntersectionObserver illuminates branch borders and headings. Project content is never hidden by viewport animation; details are available through native disclosures, including without JavaScript. Scroll remains native.

## Responsive and accessible behavior

The layout adapts at 1100, 850, and 620 pixels. Projects form a three-column desktop grid and stack on smaller screens. The hero stacks on phones. The toolkit uses four, then two columns. Experience changes from a date/content grid to a single column.

At 850 pixels and below, JavaScript enables an inline disclosure menu with expanded state, Escape dismissal, and destination focus. Without JavaScript, navigation stays visible. A skip link, semantic headings, form labels, visible focus rings, native validation, and standard anchors support keyboard access.

Contact fields appear only when JavaScript initializes. Without JavaScript, a direct email link and LinkedIn remain available. The unconfigured form prepares a mailto draft link and explicitly states that nothing has been sent. Configured submission exposes busy, success, and error states and retains text after failure.

## Source organization

`portfolio-content.mjs` holds editable content and configuration. `tools/build-portfolio.mjs` renders reusable static sections into `index.html`. `portfolio.js` contains navigation, commands, and contact behavior. `terminal-animation.js` owns boot sequencing and visibility controls. `impact-animation.js` owns highlight rotation and visibility controls. `project-transition.js` owns the native-scroll Projects reveal. `styles.css` owns presentation; `assets/favicon.svg` supplies the tab icon.

Unused perception and pothole-demo assets, their vendor files, and their tooling have been removed from the working site. Earlier versions remain recoverable in Git history and the local cleanup archive. The square browser favicon is generated from the same striped AS monogram as the navigation mark.
