# How FlameBridge answers the Flame in Freefall challenge

Each line names what the challenge asks for, what FlameBridge does about it, and where to see it
in the [live app](https://nasa-space-apps-2026-seven.vercel.app).

| The challenge asks for | What FlameBridge does | Where |
|---|---|---|
| **Summarize** experiments | A dataset overview, a summary of each test (fuel, sample shape and size, O₂, airflow, CO and CO₂, sensors, footage) and a "what differs" view for 2 to 4 tests | Home, test pages, Compare |
| **Rank** experiments | The What-if Lab ranks real tests by a documented distance to the user's condition. The assistant can rank videos by image-derived flame metrics | What-if Lab, assistant |
| **Interpret** results | The assistant explains results from tool outputs. The Learn Academy explains the physics for students | Assistant, Guided mode |
| **Habitable environments** | The Lab tests spacecraft, station and exploration-habitat conditions against the measured evidence, including higher O₂ and lower pressure | What-if Lab |
| **Data that supports predictive modeling** | A validated, null-aware input layer a modeler can start from: 129 test records, verbatim source cells and image-derived pixel time series. The test table rebuilds from NASA PSI with one command | `public/data/`, [DATA.md](docs/DATA.md) |
| **Next-generation controls and equipment** | It shows where the measured evidence ends, so researchers can see which test is missing before a finding is used for design | What-if Lab, [SCIENCE.md](SCIENCE.md) |
| **Similarities and differences** | Tests can be grouped by investigator, material, geometry and flow direction, and compared side by side | Explore, Compare |
| **Different audiences** | Expert mode for researchers and engineers, Guided mode for students and the public | Mode switch |

## What is new

- **An instrument, not a predictor.** With 129 tests from one campaign, FlameBridge does not
  train a model to forecast fires. It retrieves the closest real tests and states where the
  measured evidence ends.
- **Data recovered from the footage itself.** The telemetry burned into the ISS video is read
  back by a small neural network trained without a single hand label.
- **One action system for people and the AI.** Every change in the interface is a typed action.
  The AI uses the same actions, the server checks them, and every AI step can be undone.
- **Integrity choices.** Missing is never zero. No assumed pressure is filled in. Image sizes
  stay in pixels. NASA footage is streamed from NASA rather than copied.

## What comes next

Already planned in the project: bring PSI-20 into the main views, add more PSI investigations
through the same contract, build a fixed evaluation set for AI answers, and add hand-labelled
ground truth for flame segmentation.
