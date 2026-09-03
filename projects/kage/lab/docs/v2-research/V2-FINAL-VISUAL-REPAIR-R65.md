# V2 final visual repair R65

R65 is a bounded final-effect repair of two already generated examples. It does not add a new architecture, renderer, or case family.

## Mortise and tenon

- Source run: `dedicated-mortise-state-r62`
- Final run: `dedicated-mortise-final-r65`
- Replaced the structurally ambiguous state sheet with `r65-mortise-tenon-four-state-v2.png`.
- The rectangular tenon is smaller than the mortise on all sides, shares the same axis, enters halfway, and ends with the shoulder seated flush.
- Removed the old DOM force arrows and `荷载` label instead of hiding them with opacity.
- Rewrote the evidence copy around visible contact surfaces.
- Bounded heading size and copy width so the ending card cannot leave the viewport.

## Collapsible lantern

- Source run: `dedicated-5a3c68c1117f`
- Final run: `dedicated-lantern-final-r65`
- Replaced the oversized full-sheet `<img>` crop with four explicit 2x2 background cells.
- Kept the complete lantern visible at collection, expansion, use, and lit states.
- Matched product position to the active editorial side, added controlled subject separation, and dissolved the source-image edge into the page field.
- Removed the artificial page-height surplus that clipped the final composition at maximum scroll.

## Verification

- TypeScript: pass.
- Related tests: 24/24 pass.
- Desktop: opening, two intermediate states, and final state captured for both runs.
- Mobile: 390×844 opening captured for both runs.
- Runtime: no browser errors, no failed responses, no horizontal overflow.

The source runs remain available for research comparison. Only the R65 runs should be considered final visual candidates for these two goals.
