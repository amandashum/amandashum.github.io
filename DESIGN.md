# Design System

## Direction

A monochrome technical specimen: precise rules, large areas of true white, black controls, restrained typography, and generative ASCII imagery. The visual reference is `Desktop.jpg`, interpreted with Amanda's real portfolio content rather than copied placeholder material.

## Color

- Canvas: `#fbfbfa`
- Surface: `#f3f3f1`
- Ink: `#111110`
- Muted ink: `#686865`
- Structural line: `#deded9`
- Strong line: `#aaa9a3`
- Inverse surface: `#111110`
- Inverse ink: `#ffffff`
- Focus: `#315efb`

Color is restrained and functional. Blue appears only for keyboard focus and selected technical states.

## Typography

- Display: Georgia, Times New Roman, serif
- Interface and body: Geist, Segoe UI Variable, system sans-serif
- Technical output: Cascadia Mono, SFMono-Regular, Consolas, monospace
- Display headings use balanced wrapping and never exceed three lines.
- Body copy is limited to 70 characters per line.

## Layout

- Maximum content width: 1440px
- Outer gutter: `clamp(20px, 3vw, 48px)`
- Sections use thin borders and generous vertical rhythm.
- Asymmetry is used for narrative emphasis; repeated equal cards are avoided outside the capability matrix.
- Mobile layouts collapse to one column without horizontal overflow.

## Components

- Navigation: compact centered links with a geometric four-square mark.
- Buttons: high-contrast rectangular controls with a subtle 6px radius and press feedback.
- ASCII field: responsive generated text art, decorative and hidden from assistive technology.
- Project archive: selectable index paired with an evidence-focused project detail.
- Vision Lab: reviewable four-state computer-vision demonstration.
- Resume Agent: fixed dialog-style panel using the same monochrome system.

## Motion

- Motion explains hierarchy, state, or spatial continuity.
- Interactive transitions remain below 300ms.
- Scroll-driven ASCII transformations use `requestAnimationFrame` and transform/filter properties.
- Section reveals enhance visible content and never gate access.
- `prefers-reduced-motion` removes positional movement while retaining short opacity feedback.

## Accessibility

- WCAG 2.2 AA contrast target.
- Visible `:focus-visible` outlines.
- Semantic headings and landmarks.
- Keyboard-operable project tabs, Vision Lab, FAQ, and Resume Agent.
- Motion alternatives and touch-safe hover rules.
