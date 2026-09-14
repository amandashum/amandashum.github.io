# Amanda Shum · Scene-understanding portfolio

An interactive computer-vision portfolio with a Blender-built, depth-derived 3D hero. One Las Vegas photograph can be explored as RGB, object detections, semantic classes, relative depth, a 3D surface, or a point cloud.

## Preview

From this directory:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open [the local preview](http://127.0.0.1:4173). Serve over HTTP; opening the HTML directly does not load modules and model assets reliably. The website needs no build step, API key, model downloads, or CDN at runtime.

## Use

Select a representation below the image. In Semantics or 3D scene, select Road, Vehicles, or Trees to highlight those predicted regions. In 3D scene, drag or use arrow keys to orbit, adjust the 2D → 3D slider, or switch to a point cloud. Reset, Home, and Escape restore the view. Project navigation never depends on operating the scene.

## Active files

| File | Responsibility |
| --- | --- |
| `index.html` | Accessible page, project content, About, scene controls |
| `styles.css` | Site-wide responsive branding and layout |
| `perception.js` | Real-time WebGL rendering, picking, semantic filters, depth morphing |
| `assets/perception/scene.blend` | Editable Blender source built from inferred depth |
| `assets/perception/scene.glb` | Optimized browser geometry with morph targets |
| `assets/perception/analysis.json` | Model revisions, scores, labels, preprocessing, source hash |
| `assets/perception/*` | Semantic/depth maps, binary grids, Blender fallback render |
| `assets/vendor/three/` | Locally vendored Three.js 0.180.0 and required loaders |
| `tools/analyze_scene.py` | Local, offline-output inference pipeline |
| `tools/build_perception_scene.py` | Reproducible depth-to-Blender conversion and export |
| `tools/verify_assets.py` | Geometry, provenance, coordinate, and transfer-budget checks |
| `tools/verify_browser.js` | Playwright CLI browser acceptance checks |

Legacy assets from the previous portfolio direction have been removed. Superseded cutout-study files remain available locally under the ignored `output/superseded-cutout-study/`. The public résumé and `Edge19.jpg` are retained.

## Reproduce the data and Blender scene

The development machine already had Python 3.13, PyTorch 2.9.0+cu128, Transformers 5.5.0, OpenCV 4.12.0, NumPy, Pillow, and Blender 5.0 installed. No Python dependencies were installed for this task.

```powershell
python -u tools/analyze_scene.py
& 'C:/Program Files/Blender Foundation/Blender 5.0/blender.exe' --background --factory-startup --python tools/build_perception_scene.py
python tools/verify_assets.py
node --check perception.js
```

The first analysis run downloads official model configuration and safetensors weights to `output/model-cache/`; this folder is ignored by Git. The photograph is processed locally and is not uploaded. Remote Python code is disabled. The generated manifest records the exact model revisions used. See [the inference evidence](assets/perception/EVIDENCE.md) for model sources and limitations.

RT-DETR runs once on the full image and twice on source-coordinate crops to retain small vehicles. Boxes are transformed back to the original image, filtered at 0.40 confidence, and suppressed across crops at IoU 0.45. SegFormer predicts the full ADE20K label map; labels are not manually corrected. Depth Anything V2 predicts relative inverse depth, normalized between its first and 99th percentiles for display.

The Blender builder partitions a coherent image grid by semantic class and applies the same depth field to every part. Shape keys preserve the transition from image plane to estimated surface. This is not a full scene reconstruction or an estimate in metres.

## Browser checks

With the local server running:

```powershell
npx --yes --package @playwright/cli playwright-cli -s=vision open http://127.0.0.1:4173
npx --yes --package @playwright/cli playwright-cli -s=vision run-code --filename=tools/verify_browser.js
```

The checks exercise all six modes, semantic filters, point-cloud rendering, keyboard orbit, slider endpoints/reset, 320/390/768/1440-width overflow, reduced motion, local anchors, no-JavaScript content, and failed-model fallback. They save screenshots under `output/playwright/`. A completed run prints its results; do not infer a pass merely from this list.

### Validation performed on 2026-09-13

The asset verification and JavaScript syntax check passed. The browser acceptance script completed all six representation checks, filters, rendered-pixel change after keyboard orbit, range endpoints/reset, the four responsive widths, reduced motion, local navigation, no-JavaScript content, and failed-model fallback without a thrown assertion or observed runtime error.

`tools/verify_accessibility.js` additionally passed reduced-motion scroll invariance and unavailable-WebGL fallback. All eight foreground/background text-token pairs exceeded 4.5:1; the lowest measured ratio was 5.84:1. Desktop, mobile, detection, semantic, point-cloud, and category-highlight screenshots were visually reviewed. These are Chromium and browser-emulated viewport checks, not physical-device or full accessibility-conformance certification.

## Content evidence

The résumé and Amanda's supplied About text are the content sources. Keep 96% as fruit-classification accuracy, 75% as KSHC administrative workload reduction, and 25% as growth associated with customer analysis, seasonal marketing, and room allocation. Copilot efficiency benefits are intended improvements, not measured results.

Confirmed project context: single-image reconstruction using SAM, TRELLIS / TripoSR, and Gaussian splatting was explored at SFU and completed in April 2026. Amanda's exact implementation contribution remains to be confirmed. Chatbot Factory and Manitoba Families are ongoing MVP work; their proposed Azure stack is not a confirmed deployment.

Recognition sources remain CanAI Garage's Leadership in Action certificate (Summer 2026), the Ken Rush Scholarship announcement (March 2025), and [Queen's June 24, 2026 announcement](https://www.cs.queensu.ca/news/2026/06/24/celebrating-the-queens-computing-class-of-2026/) naming Amanda Teaching Assistant Award Runner Up. Do not add internal CanAI architecture or data, telephone numbers, or an unredacted résumé.

## Limitations and maintenance

Model confidence is not calibrated accuracy. The elevated scene contains tiny vehicles and reflective water; semantic boundaries can be coarse and detections can be wrong. No ground truth or accuracy benchmark was created for this image. Preserve visible qualifications when presenting the outputs.

The depth geometry assumes a viewing camera and relative scale. Occluded regions, true dimensions, and a complete city model cannot be recovered from this representation. Point-cloud and surface views show the same estimated data.

Three.js is pinned and self-hosted with its MIT license; the GLTFLoader utility import is adjusted to the local flat vendor directory. SegFormer has a research/evaluation use restriction; model weights are not distributed. Review model terms before adapting the pipeline to another use. See the evidence file for exact links.

No deployment, commit, or pull request was performed. Publishing needs Amanda's separate approval.
