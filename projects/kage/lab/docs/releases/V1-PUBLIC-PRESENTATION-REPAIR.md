# V1 Public Presentation Repair

## Design contract

- Entry mode: revision-led repair
- Request revision: R1
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
| Delivery integrity | build and Pages | 40 test files / 122 tests, production build and 13 local browser routes passed | pass | deploy and repeat the same remote acceptance |

## Refinement result

The abstract orb placeholders were removed. Three workbench baseline cards and six generated-case cards now use screenshots captured from their corresponding runnable experiences. The static showcase entry reuses the V1 runtime and assets but remains separate from the generated-case loader.
