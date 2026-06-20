# Amanda Shum Personal Portfolio

This repository contains the source files for Amanda Shum's personal website, hosted on GitHub Pages at:
[https://amandashum.github.io](https://amandashum.github.io)

## About

This is a one-page personal portfolio for Amanda Shum's applied AI, computer vision, automation, visual computing, and technical leadership work.

The current redesign uses a monochrome technical-specimen layout with generative ASCII artwork, a selected project archive, an interactive computer vision demo, impact evidence, and an embedded Resume Agent.

## Site Sections

- Asymmetric portfolio introduction with responsive ASCII artwork
- Technical capability index and integration ecosystem
- Selected project case studies
- Vision Lab interaction for detection, depth, segmentation, and human review
- Resume and working-principle highlights
- Resume Agent for embedded resume Q&A
- Resume PDF and contact links

## Assets

The repository includes:

- `Edge19.jpg` for the portfolio portrait
- `assets/palm-scene.jpg` for the visual work section
- `Amanda_Shum_Resume.pdf` for the resume download

`Desktop.jpg` and `Navigation.png` are local visual references and are not required by the rendered page.

## Design Documentation

- `PRODUCT.md` records the audience, purpose, personality, and strategic principles.
- `DESIGN.md` records the visual system, interaction rules, and accessibility requirements.

## Local Preview

From the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open:
[http://127.0.0.1:4173](http://127.0.0.1:4173)

## Deployment Notes

This is a static GitHub Pages site. The main page is `index.html`, with no build step required.

(c) 2026 Amanda Shum
