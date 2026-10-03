# Scene-understanding design

## Visual direction

A visitor examines an illuminated photographic scene against a dark studio background. The scene has the visual presence of a Blender render, with genuine depth-derived geometry that responds to input. The photograph carries the colour; the surrounding page uses graphite `#101416`, cool white `#f3f6f7`, and cyan `#64d9ec`.

Existing local Bahnschrift and Segoe UI fallbacks avoid external font requests. Consolas is restricted to short coordinates, model details, and scene controls. Large headlines, open spacing, thin rules, and restrained borders keep the site sleek.

## Representations

1. **Image:** original RGB photograph on a WebGL plane.
2. **Objects:** RT-DETR bounding boxes and actual model scores; no lifted rectangular crops.
3. **Semantics:** model-predicted ADE20K class map. Roads, vehicles, and trees/plants can be highlighted independently.
4. **Depth:** normalized relative inverse depth, displayed from far/dark to near/bright.
5. **3D scene:** a Blender mesh with shape keys that interpolate between an image plane and a depth-derived surface. All semantic groups share the same depth field.
6. **Pixels:** RGB sample lattice retaining original image coordinates.

The 3D scene also offers a point-cloud representation. Semantic filters dim unrelated regions rather than assigning classes arbitrary stacked depths. Clicking a surface reports its predicted class and original-image coordinate.

## Geometry and interaction

The source has top-left image coordinates. Blender uses X right, Z up, and -Y toward the viewer; glTF exports to X right, Y up, and +Z toward the viewer. The inference depth grid is 180 × 249. The assumed viewing distance is eight display units; depth is mapped to a 3.6-unit display range. These are visualization assumptions, not calibration.

Drag and arrow keys orbit through limited angles. Home, Escape, or Reset restores the default view. The depth-strength range morphs actual vertices from 2D into 3D. Initial scrolling modestly increases reconstruction strength until the user explicitly controls a representation or slider.

Frames run only while geometry is settling or input changes. Offscreen/hidden scenes pause. Device pixel ratio is capped at 1.75. The surface export uses smooth vertex normals and omits morph-normal payloads to keep the transfer below 3 MB.

## Accessibility and failure states

Native buttons expose pressed state. The range has an accessible label. Filters have visible text, not colour-only labels. Semantic class descriptions are available through buttons as well as pointer picking. Essential project content is semantic HTML, with a skip link and direct navigation.

Reduced-motion preference disables scroll-driven movement and interpolation. Manual camera commands still work discretely. Vertical touch scrolling remains available.

A rendered Blender poster remains available before initialization and on asset/WebGL failure. All project content is readable without JavaScript. Dynamic import failure also updates the fallback status.

## Evidence and limitations

The scene contains genuine pretrained-model outputs. Detection and segmentation are separate tasks and may disagree. Tiny vehicles are a particular weakness of the semantic baseline. Depth discontinuities may stretch the surface; sky is an estimated background, not finite measured geometry. The point cloud exposes these limitations rather than filling unseen surfaces.

Project visuals are clearly identified as illustrative scene studies or this portfolio's own geometry, not outputs of Amanda's separate academic projects.

## Current portfolio direction

The active page uses white, charcoal, and teal with existing system fonts.
A translucent tube occupies a reserved right-side margin from the hero
to Contact. Seven locally stored skill logos automatically descend in
staggered 24-second loops, fading at the outlet before restarting at the top.
Animation pauses while the tab is hidden.

The decoration ignores pointer input and is hidden from assistive
technology. Mobile uses a narrower tube and smaller logos. Reduced-motion
and JavaScript-disabled visitors see a stationary pile. Existing scene
documentation above describes the archived WebGL presentation.

The layout follows Swiss-inspired minimalism: a white background,
charcoal text, restrained teal, one system sans-serif family, consistent
alignment, generous spacing, and concrete first-person copy.
