# 3D photo assets pipeline

All photo assets in `src/assets3d/` come from **Poly Haven** (https://polyhaven.com), licensed **CC0** (public domain).

| Kind | Source assets |
|---|---|
| Sky panoramas (tonemapped, resized to 2048×1024) | kloofendal_48d_partly_cloudy_puresky (day), qwantani_sunset_puresky, qwantani_night_puresky |
| Textures (1k diffuse + 512 normal) | leafy_grass, excavated_soil_wall, brown_planks_05, mossy_rock |
| Vegetation/rock impostors (baked to transparent webp) | island_tree_02, tree_small_02, fir_sapling, shrub_01, shrub_02, fern_02, grass_medium_01, rock_moss_set_01, boulder_01, dandelion_01 |

The source tree models are 25–200 MB photoscans, far too heavy for a web game, so they are rendered once
into side-view sprites ("impostors"). The game camera is side-on, so they look like the real model.

Re-run (needs Python, Node, puppeteer-core, Chrome, and an unpacked `three@0.160.1` npm package in `./threepkg`):
```
python -I dl.py                              # downloads into ./ph (~270 MB, not committed)
node <repo>/scripts/serve.mjs . 5299         # serve this folder
node bake.mjs ../../src/assets3d             # bake sprites + resize skies
node shrink.mjs ../../src/assets3d/tex       # recompress textures
```
