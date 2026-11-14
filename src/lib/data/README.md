# Data access

On the server, load a validated bundle once per accession and process. Loader results are shared
and should be treated as immutable. Read/validation failures throw with the filename and details.
The server entry point accepts an accession such as `PSI-25` or `psi-25`.

```ts
import { getDataset, getExperiment, getManifest } from "@/lib/data";

const { experiments } = getDataset("PSI-25");
const manifest = getManifest("PSI-25");
const run = getExperiment("PSI-25:O1"); // also accepts "O1" in PSI-25
```

Pass the run collection to client components. Import the pure query functions in client code.

```ts
import { facetCounts, filterExperiments, parameterRanges, representativeAirflow } from "@/lib/data/queries";

const visible = filterExperiments(experiments, { airflowCmS: { min: 5, max: 10 } });
const facets = facetCounts(visible);
const ranges = parameterRanges(experiments);
const medianFlowCmS = run ? representativeAirflow(run) : null;
```

Filters combine with AND across fields and OR within a facet. Empty arrays/ranges impose no
constraint. Ranges are inclusive, and airflow filters match any measured set-point. Median
airflow is a separate summary. Empty measurements yield null extents or medians. Unknown
categories have an `unknown` facet, and video and QA facets report yes/no counts.

`fixtures/psi-25.json` contains eight unmodified published PSI-25 records from the initial
bundled data, covering all principal investigators, flagged oxygen and missing video.
