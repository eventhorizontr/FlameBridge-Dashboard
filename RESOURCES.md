# Resources and references

Everything used to build FlameBridge: data, literature, code, text, visuals and tools, including
open-source and freely available ones. Licences are stated where they apply. Where and how AI
(SI) tools were used is in [AI_USAGE.md](AI_USAGE.md).

## 1. NASA data and resources

| Resource | Used for | Link | Licence |
|---|---|---|---|
| NASA PSI-25, Burning and Suppression of Solids II (BASS-II) | Every view: 129 ISS tests, tables, documents, videos | [DOI 10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) | CC0 1.0 |
| NASA PSI-20, ACME Burning Rate Emulator | Second builder (built, not shown in the main views) | [DOI 10.60555/vb93-3y72](https://doi.org/10.60555/vb93-3y72) | CC0 1.0 |
| NASA Biological and Physical Sciences data hub | Entry point to the PSI repository | [science.nasa.gov](https://science.nasa.gov/biological-physical/data/) | |
| BASS-II Summary Report, NASA TM 20210011385 | Learn Academy | [NTRS](https://ntrs.nasa.gov/citations/20210011385) | |
| Microgravity Flammability of PMMA Rods in Concurrent Flow | Literature basis | [NTRS 20150008961](https://ntrs.nasa.gov/api/citations/20150008961/downloads/20150008961.pdf) | |
| Combustion of Solids in Microgravity: Results from the BASS-II Experiment | Literature basis | [NTRS 20160000593](https://ntrs.nasa.gov/api/citations/20160000593/downloads/20160000593.pdf) | |
| Microgravity Flame Spread in Exploration Atmospheres, NASA/TM-2008-215260 | Literature basis | [NTRS 20080034883](https://ntrs.nasa.gov/citations/20080034883) | |
| Piloted Ignition Delay of PMMA in Space Exploration Atmospheres | Literature basis | [NTRS 20080013149](https://ntrs.nasa.gov/citations/20080013149) | |
| Recommendations for Exploration Spacecraft Internal Atmospheres, NASA/TP-2010-216134 | Exploration atmosphere | [nasa.gov](https://www.nasa.gov/wp-content/uploads/2023/03/henninger-8.2-34-atm-tp216134-2010.pdf) | |
| NASA Exploration Atmosphere Tests 1 and 2 | Exploration atmosphere (34 % O₂, 56.5 kPa) | [NTRS 20230015380](https://ntrs.nasa.gov/citations/20230015380) | |
| Research Questions and Challenges for Improved Spacecraft Fire Detection | Literature basis | [NTRS 20210022143](https://ntrs.nasa.gov/api/citations/20210022143/downloads/Fire%20detection%20white%20paper%20final%20211031.pdf) | |
| NASA NSSDCA Planetary Fact Sheet | Learn Academy | [nssdc.gsfc.nasa.gov](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | |
| NASA-STD-6001, Test 1 (upward flame propagation) | Named as the ground screening test the project compares against | | |

File-level trail with hashes: [data-manifest.csv](docs/data-manifest.csv). No Space Agency Partner
data is used.

## 2. Literature

| Reference | Link |
|---|---|
| Olson and Ferkul (2017), Microgravity flammability boundary for PMMA rods in axial stagnation flow, Combustion and Flame 180 | [DOI](https://doi.org/10.1016/j.combustflame.2017.03.001) |
| Link, Huang, Fernandez-Pello, Olson, Ferkul (2018), The Effect of Gravity on Flame Spread over PMMA Cylinders, Scientific Reports 8 | [DOI](https://doi.org/10.1038/s41598-017-18398-4) |
| Olson et al. (2019), Flammability Limits from BASS-II Testing in Microgravity Compared to Normal Gravity Limits, ICES-2019-101 | [record](https://ttu-ir.tdl.org/items/1922ad9f-ef4c-4f52-96a4-980c23debe5e) |
| Olson and Ruff (2009), Microgravity Flame Spread over Non-Charring Materials in Exploration Atmospheres, SAE 2009-01-2489 | [DOI](https://doi.org/10.4271/2009-01-2489) |
| Bhattacharjee, Carmignani, Celniker, Rhoades (2017), Measurement of instantaneous flame spread rate over solid fuels using image analysis, Fire Safety Journal 91 | [DOI](https://doi.org/10.1016/j.firesaf.2017.03.039) |
| Cover and Hart (1967), Nearest neighbor pattern classification, IEEE Transactions on Information Theory 13 | [DOI](https://doi.org/10.1109/TIT.1967.1053964) |
| Wang et al. (2004), Image quality assessment: from error visibility to structural similarity (SSIM) | [DOI](https://doi.org/10.1109/TIP.2003.819861) |
| Oquab et al. (2024), DINOv2 | [arXiv:2304.07193](https://arxiv.org/abs/2304.07193) |
| T'ien (1986), Diffusion flame extinction at small stretch rates, Combustion and Flame 65 | |
| Law (2006), Combustion Physics, Cambridge University Press | |
| Quintiere (2006), Fundamentals of Fire Phenomena, Wiley | |
| Turns (2012), An Introduction to Combustion, 3rd ed., McGraw-Hill | |
| Dasch (1992), onion-peeling Abel inversion, Applied Optics | |
| Foote (2000), checkerboard novelty for audio segmentation | |
| Farnebäck (2003), two-frame motion estimation, as implemented in OpenCV | |

The literature is cited, not copied. No text or figure from these works is reproduced.

## 3. Visuals and media

| Asset | Source | Rights |
|---|---|---|
| ISS flame videos (streamed, not stored) | NASA PSI-25 | CC0 1.0 |
| Fallback clips B3, O1, T1, keyframes, posters, landing still sequence | Cut or transcoded from NASA PSI-25 videos | CC0 1.0 (source) |
| FlameBridge mark, team mark and wordmark, horizon glow | Team design, made by hand without SI | Team |
| Demo video and its two poster frames | Team production. Contains SI-generated content, marked with a visible watermark | Team |
| Screenshots in `docs/` | Captures of the running app | Team |
| Fonts: [Geist and Geist Mono](https://vercel.com/font), [Unbounded](https://fonts.google.com/specimen/Unbounded) | Google Fonts through `next/font` | SIL Open Font License 1.1 |
| Icons | [Lucide](https://lucide.dev) (`lucide-react`) | ISC |

Details per file: [MEDIA_CREDITS.md](docs/MEDIA_CREDITS.md). No NASA logo, insignia, flag or mission
identifier is used.

## 4. Software and tools

| Area | Tools |
|---|---|
| Languages and runtimes | [TypeScript](https://www.typescriptlang.org), [Python](https://www.python.org), Node.js, pnpm |
| Web app | [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [D3](https://d3js.org), [three.js](https://threejs.org), [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [Motion](https://motion.dev), [Zustand](https://github.com/pmndrs/zustand), [nuqs](https://github.com/47ng/nuqs), [Zod](https://zod.dev), `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `clsx`, `tailwind-merge` |
| Computer vision | [OpenCV](https://opencv.org), [NumPy](https://numpy.org), [PyTorch](https://pytorch.org), [timm](https://github.com/huggingface/pytorch-image-models), [DINOv2](https://github.com/facebookresearch/dinov2), [ONNX](https://onnx.ai), [FFmpeg](https://ffmpeg.org) and ffprobe, Hugging Face Hub (source of the DINOv2 weights through timm) |
| AI services | [OpenAI API](https://platform.openai.com) (`gpt-6.1-sol`) through the `openai` SDK, [Anthropic Claude API](https://platform.claude.com/docs/en/home) (`claude-opus-5-5`) through `@anthropic-ai/sdk` |
| AI coding agents | Claude Code, OpenAI Codex, Antigravity (until 2026-11-15) |
| AI for text and research | Claude (literature search, drafting of the submission text), OpenAI Codex (screen mockups used as design references) |
| Quality | [Vitest](https://vitest.dev), Python unittest, [ESLint](https://eslint.org) with `eslint-config-next`, [GitHub Actions](https://github.com/features/actions) workflow |
| Hosting and data work | [Vercel](https://vercel.com), Upstash Redis through the Vercel Marketplace, GitHub (repository, issues, pull requests), YouTube (demo video), [Google Colab](https://colab.research.google.com) and a Jupyter notebook, Google Drive |

Exact versions are in `package.json`, `pnpm-lock.yaml` and `pipeline/vision/requirements.txt`.
Each dependency keeps its own licence.

## 5. Licence of this repository

Code and docs: [MIT](LICENSE). NASA PSI data: CC0 1.0. Team brand assets are not covered by
the MIT licence. FlameBridge is not affiliated with or endorsed by NASA.
