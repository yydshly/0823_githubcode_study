# Local runtime entry repair

- Entry mode: repair-led
- Request revision: R8
- Target: `docs/projects/kindergrimm.html`
- Visual ambition: functional clarification
- Experience architecture: editorial research index → local interactive runtime
- Primary journey: open the local research page → launch NPC Factory → inspect generated characters
- Authorization: diagnose and repair the NPC Factory entry requested by the user

## Baseline

- The entry URL is correct: `http://127.0.0.1:8882/projects/kindergrimm/npc-factory/`.
- Port `8882` had no listener, so the browser could not reach the target.
- The file-based research page did not explain that the interactive demos require the repository HTTP server.

## Acceptance contract

- The dependency on the local HTTP server is visible beside the launch actions.
- The exact startup command is available without searching the document.
- Clicking **打开 NPC 工厂** reaches the live factory when the server is running.
- The factory can generate its default 12-character roster.
- The adjacent scenario entry still works and the clarification remains readable at mobile width.

## Coverage ledger

| Surface | Desktop | Mobile | Runtime | Status |
| --- | --- | --- | --- | --- |
| Research index | clarification visible | no horizontal overflow at 390 × 844 | file URL | pass |
| NPC Factory | actual click; 12 generated / 12 unique | entry remains usable | HTTP `:8882` | pass |
| NPC scenarios | actual click; 8 actors / 8 unique | entry remains usable | HTTP `:8882` | pass |

