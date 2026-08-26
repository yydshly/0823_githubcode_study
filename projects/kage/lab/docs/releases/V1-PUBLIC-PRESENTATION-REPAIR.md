# V1 Public Presentation Repair

## Design contract

- Entry mode: revision-led repair
- Request revision: R2
- Target user and context: GitHub visitors evaluating whether Kage can turn an idea into a finished Three.js page
- Desired first impression: real generated results are visible immediately; V1 and V2 boundaries are unambiguous
- Visual ambition: Immersive
- Experience architecture: Editorial Flow linking to independent Spatial Stage experiences
- Visual constraints: use final browser evidence, never abstract placeholder art; preserve each experience's own composition
- Information constraints: explain the product in the repository README and distinguish workbench baselines from generated cases
- Operation constraints: every card opens a public static route without the local API
- State constraints: full motion and reduced-motion remain supported by the existing runtime
- Environment constraints: GitHub Pages project base path, desktop and 390px mobile
- Primary journey: repository README → project entry → V1 real preview → runnable sample or final case
- Required artifacts: external README description, three workbench sample routes, six real case previews, browser verification
- Autonomy authorization: user explicitly requested direct repair
- User-decision boundary: none inside this repair

### R2 scope revision — publish the workbench itself

- Preserved: the three baseline sample routes and six curated case entries verified in R1.
- Reopened: public navigation and the idea-to-preview journey because R1 exposed samples but omitted the workbench surface.
- Public boundary: GitHub Pages runs the deterministic local generator and the real Three.js preview runtime. Codex, MiniMax, MiMo and OpenAI remain server-backed capabilities and must be visibly unavailable rather than failing after submission.
- Primary journey: project or V1 entry → public workbench → edit the brief → generate a local direction → inspect the live Three.js preview.

## Observable completion criteria

- The repository README names Kage and links to the project, V1 and V2.
- V1 shows three existing workbench samples and all six curated cases.
- Every visual card uses a screenshot from the corresponding real experience.
- Each of the three sample links starts its matching Three.js experience on Pages.
- Desktop and 390px layouts have no clipped primary content or horizontal overflow.

## Coverage

| User requirement | Surface | Evidence | Status | Next action |
| --- | --- | --- | --- | --- |
| External README description | repository README | Kage capability, V1/V2 and three public links added | pass | none |
| Workbench samples deployed | V1 sample routes | Chromium started resonance, tidal and chromatic experience ids with canvas | pass | none |
| Real case entry visuals | V1 gallery | nine images loaded; desktop and 390px gallery verified without overflow | pass | none |
| Delivery integrity | build and Pages | 40 test files / 122 tests, Pages build and 15 local browser route/state checks passed | pass | deploy and repeat the same remote acceptance |
| Public workbench entry | project hub and V1 header | both visible links resolve to the built `workbench.html` route | pass | none |
| Static workbench journey | public workbench | edited brief generated a new run id, persisted manifest and `/v1/showcase/` live preview | pass | none |
| Provider boundary | public workbench | local selected; five server-backed options disabled; explicit boundary visible on desktop and 390px | pass | none |

## Refinement result

The abstract orb placeholders were removed. Three workbench baseline cards and six generated-case cards now use screenshots captured from their corresponding runnable experiences. The static showcase entry reuses the V1 runtime and assets but remains separate from the generated-case loader.

R2 publishes the workbench as a first-class Pages route. Its static mode completes a real deterministic idea-to-preview loop and reuses the same V1 runtime for generated manifests. It does not pretend that a static host can execute Codex or provider APIs: those options are disabled with a visible explanation, while the local project retains the full server-backed workflow.
