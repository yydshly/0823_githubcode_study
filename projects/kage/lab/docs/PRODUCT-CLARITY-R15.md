# R15 Product clarity repair

## Observed problem

- `provider=auto` creates a local bootstrap draft during initialization.
- The product layer auto-selects that draft and presents it as the user's generated result before the user clicks Generate.
- The runnable reference experiences are collapsed on desktop and completely hidden on mobile.

## Product decision

The primary journey is **describe → generate → inspect quality**.

- Auto/model modes start in a truthful waiting state. A bootstrap draft may prepare internal data, but it is never shown as a generated result.
- Only an explicit user generation request may reveal and label a result as model-generated.
- Explicit `provider=local` remains a valid fast-draft path for development and diagnostics.
- Two runnable capability samples remain visible as secondary references. They open separately and never replace the user's result.

## Acceptance checks

1. Auto mode initially shows no result iframe and no “current best result” panel.
2. The page clearly says that clicking Generate will invoke the available model.
3. Two runnable sample links are visible on desktop and mobile.
4. Clicking Generate changes the UI to model-generating, then reveals the selected model result.
5. Local mode still produces a fast draft for deterministic tests.
6. No horizontal overflow, error overlay, or broken route is introduced.
