# Asset Lab v0.4 — Asset Usage Proofs Contract

## Design contract

- Entry mode: revision-led continuation.
- Request revision: 4.
- Target user and context: a product or content designer deciding whether Kindergrimm source assets are useful beyond the asset viewer.
- Desired first impression: the same generated material set is visibly consumed in three different product contexts, with representation choices that match each context.
- Visual ambition: Immersive.
- Experience architecture: Hybrid Workspace.
- Visual constraints: preserve the same Asset Lab route, six-mode paper interface, and v0.3 material plan; add one usage-proof surface, not another standalone product.
- Information constraints: each proof states consumer, actual source asset, why the representation fits, production value, and remaining gap.
- Operation constraints: choose narrative, collection, or world placement; switch proofs without regenerating unrelated assets; allow changing the source scene preset and refreshing all proofs.
- State constraints: narrative active, collection active, 3D world active, alternative scene plan, keyboard switching, mobile, reduced motion, WebGL-off fallback.
- Environment constraints: canonical route `http://127.0.0.1:8882/projects/kindergrimm/asset-lab/?mode=usage`; upstream lock `5857b1e1`; runtime LLM remains absent.
- Primary journey: choose a generated scene material plan → inspect three realistic consumers → compare representation and gaps → decide which product direction deserves deeper implementation.
- User-defined phases: describe and demonstrate several extension/use scenarios based on the source library.
- Required artifacts: sixth Usage Proof mode, three scenario descriptions, real 2D consumption proof, real UI/collection proof, combined procedural 3D world proof, performance observation, browser evidence, delivery report.
- Autonomy authorization: user confirmed “以几个扩展使用场景进行描述和演示”.
- User-decision boundary: a full dialogue system, inventory backend, playable game, animation system, GLB export, collision/LOD, persistence, and new art packs are outside this revision.
- Observable completion criteria: three use scenarios exist and are keyboard selectable; narrative and collection proofs use the actual generated Drawn/Gloss/item outputs as UI media; the world proof rebuilds Voxel character and plant as live Three.js geometry in one scene; the world includes a truthful 2D item HUD rather than fake item geometry; scene preset refresh changes all proofs; desktop/tablet/mobile/reduced-motion/WebGL-off pass; world render statistics are recorded; prior modes remain passing; zero open status remains.

## Representation-by-use contract

| Use scenario | Consumer | Preferred source representation | Demonstration | Explicit non-goal |
| --- | --- | --- | --- | --- |
| Narrative dialogue | story/dialogue UI | Drawn transparent 2D + item icon | quest dialogue card with portrait, objective, item token | not a full branching dialogue engine |
| Collection/inventory | catalog/reward UI | Gloss proxy + procedural item PNG | collectible/reward detail with provenance and rarity | not persistence, economy, or drag-and-drop inventory |
| World placement | Three.js scene | Voxel procedural geometry + `buildPlant` geometry + 2D item HUD | combined isometric placement, camera-scale and draw-call proof | item PNG is not collision geometry; not a playable level |

## Hybrid workspace contract

- Scene base: WebGL for the world proof; semantic HTML/CSS for narrative and collection proofs.
- Scene persistence: the selected proof remains visible while its context panel explains use and gaps.
- Foreground control model: three proof tabs plus one source scene preset selector and refresh action.
- State-to-scene mapping: narrative/collection switch 2D consumers; world activates combined geometry; fallback keeps descriptions and 2D consumers while replacing WebGL with an explicit capability note.
- Mobile transformation: tabs wrap to a compact grid and proof/context stack vertically.
- Fallback: narrative and collection remain fully viewable; world exposes source Recipes and unavailable-runtime message.

## Coverage manifest

| User phase | Requirement | Surface/state | Evidence | Stage | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| Preserve | v0.3 scene plan and earlier five modes remain | adjacent modes | automated regression | 1 | continue | run after integration |
| Expand | sixth Usage Proof mode on same route | navigation | DOM + keyboard | 4 | continue | implement mode |
| Describe | three scenarios state user, asset, value, and gap | all usage proofs | DOM evidence | 3 | continue | author proof registry |
| Demonstrate | narrative proof consumes actual Drawn + item assets | narrative active | image source + content | 5 | continue | implement narrative consumer |
| Demonstrate | collection proof consumes actual Gloss + item assets | collection active | image source + provenance | 5 | continue | implement collection consumer |
| Demonstrate | world proof combines actual Voxel + plant geometry | world active | WebGL stats + screenshot | 5 | continue | implement combined renderer |
| Truth | world item remains 2D HUD, not fake 3D | world active | DOM/source boundary | 6 | continue | implement HUD contract |
| Refresh | source scene preset changes all three proofs | alternative plan | interaction + fingerprints | 5 | continue | wire preset refresh |
| Accessibility | proof tabs and refresh keyboard reachable | keyboard | focus + active state | 7 | continue | verify |
| Responsive | 1440, 1024, 390 without overflow | three proofs | screenshots + dimensions | 7 | continue | verify |
| Motion | reduced-motion preserves proof meaning | reduced motion | browser media state | 7 | continue | verify |
| Performance | combined world statistics and load time measured | world active | renderer info + timing | 8 | continue | measure |
| Fallback | WebGL-off keeps two 2D proofs and truthful world note | fallback | browser path | 8 | continue | verify |
| Closure | report, evidence, zero open status | all | audit | 9 | continue | close v0.4 |
