# V2 R172 · KAGE 开场排练室

## Design contract

- Entry mode: brief-led, based on the frozen R171 guidance baseline.
- Request revision: R172 / 1.
- Target user and context: an independent creator who has a rough product idea and needs to feel, test and save the opening direction before asking Codex to build the complete site.
- Desired first impression: walking into a real projection rehearsal space where an unfinished idea is physically brought into focus; calm, tactile and cinematic rather than a dashboard or a generic dark-tech hero.
- Visual ambition: Immersive.
- Experience architecture: Spatial Stage.
- Scene base: one formal generated photographic asset + Canvas light/atmosphere + CSS mask and typography.
- Scene persistence: the rehearsal stage remains visible from entry through saved result; foreground copy and controls change without replacing the scene.
- Foreground control model: idea field, three opening rhythms, wheel/keyboard scrub, sound preview and save/continue actions.
- State-to-scene mapping: `waiting` keeps the stage veiled; `rehearsing` reveals projection and light paths; `ready` fixes the full composition; `saved` stamps the final opening card. Asset failure preserves the readable product path.
- Mobile transformation: the same stage remains behind a compact bottom sheet; no desktop side panel is forced into a long unrelated page.
- Fallback: readable HTML product flow remains usable if the image, Canvas, audio or animation is unavailable.
- Visual constraints: KAGE identity is present but subordinate to the product scene; warm physical materials, editorial typography and one clear projected subject; no embedded text in the generated asset.
- Information constraints: state why this is a rehearsal rather than a finished website; keep the journey to entry, use, result and continuation.
- Operation constraints: wheel, pointer, buttons and keyboard must share one progress state; audio must be user-triggered and meaningfully change with rhythm.
- Engineering constraints: preserve V1 and frozen deliveries; use one asset batch, one full build, at most two deterministic repairs and at most one visual refinement; no silent retry or new global rule.
- Primary journey: enter or edit one idea → choose the desired opening rhythm → wheel/drag/keyboard to rehearse the opening → optionally hear its pulse → save one opening direction → continue to KAGE creation.
- Observable acceptance criteria: theme and purpose understandable in the opening; asset is loaded and visually responsible; wheel/keyboard update the same scene and progress; sound preview has distinct rhythm; saved result is visible and reusable; 390px layout has no blocking overflow; reduced-motion and image fallback remain operable; browser evidence is tied to the final bundle.
- Autonomy authorization: the user repeatedly authorized continuing within the first goal without further confirmation; Codex may choose the one direction, one asset and implementation details inside this contract.
- User-decision boundary: new backend services, providers, deployment changes or edits to frozen V1/deliveries require separate authority.

## Positive reference evidence used

Only already-established project capabilities are used; no new reference or rule is added during R172.

1. `spatial-scroll-world` — borrow the principle that wheel progress changes a persistent scene, not three fixed pages.
2. `editorial-art-direction` — borrow asymmetric hierarchy and restrained copy so the product reads before the effect.
3. `sound-as-causal-interface` — borrow user-triggered, state-linked sound; do not add ambient audio that cannot be explained.

The references are advisory. The implementation remains free to use any method that better serves the experience.

## Coverage manifest

| User phase | Requirement or artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| R172 direction | Guidance is derived before the build | contract + reference record | this file | 0 | pass | build the runnable route |
| R172 asset | One formal asset carries the declared visual role | desktop opening + image fallback | decoded image witness + fallback browser state | 1, 8 | pass | one 1.94MB project asset loaded; blocked-image route remained operable |
| Entry | Theme, audience and promise are understandable | desktop opening | screenshot + DOM assertions | 2, 3 | pass | final `01-desktop-opening.png` reviewed |
| Use | Wheel, drag and keyboard drive one rehearsal timeline | desktop active state | interaction observations | 4, 5 | pass | shared progress and `02-desktop-rehearsal.png` verified |
| Use | Three rhythms change scene and audible pulse | desktop active state | before/after DOM + audio state | 5, 6 | pass | rhythm, scene copy and user-triggered Web Audio verified |
| Result | One opening direction can be saved | desktop saved state | screenshot + state witness | 5, 6 | pass | final `03-desktop-saved.png` reviewed |
| Continuation | Saved direction links to the existing KAGE entry | desktop saved state | final href assertion | 5 | pass | final href carries brief, opening and source |
| Adaptation | Primary journey remains usable at 390px | mobile opening and result | screenshots + overflow witness | 7 | pass | final `04-mobile-saved.png`; zero horizontal overflow |
| Accessibility | Keyboard focus, reduced motion and semantic controls remain usable | desktop reduced-motion | browser assertions | 7, 8 | pass | keyboard End and reduced-motion path verified |
| Engineering | Typecheck and Pages build pass | repository | command output | 9 | pass | 11/11 tests, TypeScript and Pages build passed |
| Archive | Final identity and evidence bind to one bundle | DirectCreativeRun + formal product registry | runId + bundleHash + archive test | 9 | pass | `direct-r172-kage-opening-rehearsal` + `d5d93376…a9969` registered |

## Final execution ledger

- Current stage: Stage 9 delivery closure complete.
- Final decision: `pass`; the result enters the formal-product archive rather than the 12-item research gallery.
- Budget used: one direction, one asset batch, one full build, two deterministic repairs and zero visual refinements.
- Deterministic repairs: register the new Pages input; correct the formal-product cover locator in the browser test. Neither changed the frozen creative guidance or final product design.
- Final identity: `direct-r172-kage-opening-rehearsal` / `d5d93376479ef04505e20537cf2262315bac7f93bc0f3d1029b6b310211a9969`.
- Browser evidence: desktop entry, active rehearsal, saved result and 390px saved result; keyboard, reduced-motion, asset fallback, audio trigger and archive identity are executable assertions.
- Stop reason: every coverage row is pass and the R171 question has been answered positively; adding another reference, rule, asset batch or visual iteration would violate the validation boundary.

## R172 conclusion

The frozen guidance did enter the work before code: a specific audience, emotional promise, persistent scene, one formal asset role, one meaningful interaction loop and one truthful result were decided first. The page then used the techniques that served those responsibilities—generated photography, masks, Canvas light, editorial type and Web Audio—without making any technique mandatory.

This proves the current project is more than “give Codex a theme and hope”: the same R171 baseline can constrain execution time, preserve creative freedom, bind evidence to the final bundle and promote only a complete product result. It does not prove arbitrary ideas can yet be generated automatically from the workbench; that remains an explicitly deferred integration problem, not a missing visual capability in this stage.
