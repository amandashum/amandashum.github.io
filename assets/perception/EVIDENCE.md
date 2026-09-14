# Scene inference evidence

Research and inference date: 2026-09-13. Task: represent one supplied photograph through local detection, semantic segmentation, relative depth, and Blender geometry. This is an evaluated baseline, not a state-of-the-art claim or a benchmark comparison.

| Task | Selected model | Reason and limitation |
| --- | --- | --- |
| Object detection | [RT-DETR R50](https://huggingface.co/PekingU/rtdetr_r50vd) | Official Transformers integration and safetensors; COCO vehicles/people classes. Crops preserve small objects; duplicate boxes are suppressed. Apache-2.0 model card. |
| Semantic segmentation | [SegFormer B0 ADE20K](https://huggingface.co/nvidia/segformer-b0-finetuned-ade-512-512) | Compact baseline includes road, tree, car, sky, building, and water. The elevated viewpoint and tiny vehicles challenge its 512-pixel input. [NVIDIA research/evaluation license](https://github.com/NVlabs/SegFormer/blob/master/LICENSE); weights are not distributed with the site. |
| Relative depth | [Depth Anything V2 Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf) | Dense relative depth with a small official checkpoint. Apache-2.0 for this Small variant; no claim of metric accuracy. [Author repository / NeurIPS 2024](https://github.com/DepthAnything/Depth-Anything-V2). |

Larger segmentation variants and Mask2Former were considered but deferred: their added model size was not needed to establish an inspectable baseline on one photo. Their potential boundary improvement has not been measured here. Promptable segmentation would require an additional semantic-labeling step. Generative full-3D models were deferred because they can invent surfaces absent from the photograph.

## Observed output

The executed detector produced 26 retained predictions: 22 cars, one truck, and three people. These are predictions, not a ground-truth count. The segmentation output contains 17 ADE20K classes. The sampled depth and class grids contain 44,820 entries (180 × 249). Exact model commit identifiers, boxes, scores, source-image SHA-256, and class counts are in [analysis.json](analysis.json).

The semantic map is deliberately unretouched. It captures broad scene regions but misses many tiny cars that the tiled detector detects. Swimming-pool and water classes both appear around the lake. Trees and plants form the interface's vegetation group. These differences are useful examples of separate representations having different granularity and failure modes.

## Spatial conventions

Model boxes use original-image pixels with top-left origin. Segmentation preserves the original dimensions. The depth map is normalized relative inverse depth (zero far, one near), with percentile clipping only for display. It is not a measurement in metres.

The Blender builder uses a display camera eight units from the image and a 3.6-unit depth range. Each image sample is back-projected under that assumed camera. The same field drives all semantic regions. No calibrated intrinsics, hidden-side geometry, multiview correspondence, or measured scale is available.

The semantic geometry uses majority labels over grid triangles. This is a display approximation of the preserved full-resolution class map, not a replacement prediction. The browser loads the Blender export and supports a depth morph and point-cloud rendering.

## Verification scope

`tools/verify_assets.py` checks source provenance, legal image coordinates, confidence range, finite normalized depth, class-grid size and coverage, nonempty requested semantic groups, Blender export provenance, morph targets, and the six-megabyte transfer budget. Visual and interaction checks are separate in `tools/verify_browser.js`.

No accuracy, IoU, detection recall, depth error, or metric reconstruction result is claimed without ground-truth annotations. No user-image upload, remote inference, or model training took place.

## Runtime source

The browser uses locally vendored [Three.js](https://threejs.org/manual/en/loading-3d-models.html) 0.180.0 and a [Blender glTF export](https://docs.blender.org/manual/en/5.0/addons/import_export/scene_gltf2.html). Model weights remain in the ignored local cache. Browser runtime does not require an ML framework or external CDN.
