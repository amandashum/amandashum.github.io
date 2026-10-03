# Amanda Shum portfolio

Static HTML, CSS, and JavaScript. No build or dependency installation is required for the website.

## Preview

Run `python -m http.server 4173 --bind 127.0.0.1`, then open http://127.0.0.1:4173/.

## Update

- `index.html`: biography, certification, project stories, education, and contact.
- `styles.css`: shared styling and responsive layouts. The final portfolio block supplies the white/charcoal/teal presentation.
- `pothole-demo.js`: sample-image selection, overlay drawing, confidence filtering, and accessible detection descriptions.
- `assets/pothole/predictions.json`: actual detections generated locally from Amanda’s trained YOLOv8 checkpoint. Coordinates refer to the original image dimensions.
- `assets/pothole/`: four copied project sample images.

The demo displays saved model predictions; it does not run inference in the visitor’s browser. Show detections reveals the saved boxes. Confidence is a model score, not measured accuracy. The slider filters raw scores before rounding labels.

## Model provenance

Source project: `C:/Users/amand/Desktop/CMPT 742/CMPT742-Final-Project---Pothole-Detection`.
Checkpoint: `runs/detect/train14/weights/best.pt`, copied to ignored `output/pothole-model/best.pt`.
The checkpoint is trained from `yolov8l.pt`. Inference used Ultralytics 8.3.233, image size 640, confidence floor 0.05, and IoU threshold 0.7. The manifest stores the checkpoint SHA-256.
No weights, paid APIs, camera access, uploads, or server-side inference are part of the published demo.

The project dataset README identifies a Roboflow dataset under CC BY 4.0. The separate Media images’ publication provenance still needs confirmation before publishing. They were copied from the supplied project, not sourced from that dataset automatically.

## Content

Use the supplied current resume. Keep 96% specific to fruit classification and 85% to Gridworld area-coverage success. Keep KSHC metrics in their operational context. Azure work is ongoing; the pothole demo is YOLOv8, not Azure-hosted inference.
The existing public PDF is phone-free in extracted text but predates the current certification and Azure wording. An updated approved public PDF remains a handoff item.

## Validation

`node --check pothole-demo.js` checks JavaScript syntax. Browser checks should cover all four images, actual confidence labels, show/hide, threshold filtering, no detections, reset, keyboard input, local anchors, console errors, and widths 320/390/768/1440. Review desktop and mobile screenshots and reduced motion.
The older `tools/verify_browser.js` and `tools/verify_accessibility.js` target the archived 3D scene and do not validate the current pothole page.

Current browser validation and screenshots are recorded in the delivery chat and ignored `output/playwright/`.

## Legacy scene

`perception.js`, `tools/analyze_scene.py`, `tools/build_perception_scene.py`, and `assets/perception/` remain available but are no longer loaded by the page. Preserve `assets/perception/EVIDENCE.md` when reusing those outputs.

Nothing is published automatically by these edits. Publishing and committing require Amanda’s approval.

## Portfolio pipeline

The section order is Hero, About, Experience, Projects, Contact.
Certifications appear within About. The pothole demo is embedded in its
project.

`skills-pipeline.js` automatically loops decorative logos down the tube
on staggered 24-second cycles, fading at the outlet before restarting.
Animation pauses in hidden tabs and respects reduced motion.
`assets/skills/` contains local Devicon SVGs and the upstream licence.
No animation dependency or external runtime request is required.

Validate section order, navigation, the relocated demo, automatic logo looping,
reduced motion, JavaScript-disabled content, and layout at
320, 390, 768, and 1440 pixels.

The layout follows Swiss-inspired minimalism: a white background,
charcoal text, restrained teal, one system sans-serif family, consistent
alignment, generous spacing, and concrete first-person copy.
