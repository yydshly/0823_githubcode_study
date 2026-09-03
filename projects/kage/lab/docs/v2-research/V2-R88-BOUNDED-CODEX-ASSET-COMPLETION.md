# V2 R88 — Bounded Codex Asset Completion

## Stage goal

Turn a stopped asset gate into one finite continuation of the **same** generation job:

`idea → contract → at most two decisive assets → one submission → same-job authoring`

R88 does not add another creative direction, retry loop, or case-generation pass.

## Implemented contract

- A blocked job receives a server-generated, deterministic `completionId` bound to its job and current missing responsibilities.
- One completion exposes at most two critical image responsibilities. Subject precedes environment; lower-value layers do not expand the batch indefinitely.
- Every submission carries a unique `submissionId`, covers the complete current batch, and may be consumed only once.
- Requirement IDs and asset IDs must be unique and must belong to the current job contract.
- The whole read → asset resolution → quality gate → persisted transition is serialized per job. Replaying the same submission is an idempotent no-op.
- Only the first `blocked → ready` transition starts authoring. Existing `activeJobs` and the one-pass authoring budget remain the second safety boundary.
- A Codex review receipt may project a decoded uploaded asset to `L3-presentable` **only inside the current job/requirement**. The shared asset cache remains `L2-inspectable`.
- The receipt must explicitly pass subject, integration, and continuity checks. State-change work additionally requires real state evidence.
- A reviewed completion can never claim `L4-cinematic`; L4 still requires an explicitly curated/licensed L4 asset and matching state evidence.
- If the single completion does not pass the gate, it becomes `exhausted`; the job remains stopped and does not create another batch automatically.

## Workbench behavior

- Both asset-copy entry points now use the same stable task text and real `jobId + completionId + requirementId` identity.
- The task explicitly says to continue the same job, not reinterpret the idea or create another job.
- Ordinary uploads remain L2 and do not silently spend the recovery attempt for an L3/L4 requirement.
- When a valid submission resumes the job, the terminal polling marker is cleared so the existing job continues to update.
- Older blocked jobs receive their completion contract once when read; the browser no longer invents an incompatible completion ID.

## Trust boundary

The reviewed-Codex receipt is a local project handoff contract, not a public cryptographic attestation. The server still performs R87 byte/pixel fitness checks and scopes the L3 projection to one job. A future hosted multi-user deployment would additionally authenticate and sign this receipt.

## Verification

- Focused R88 suite: 5 files / 41 tests passed.
- Full suite: 72 files / 344 tests passed.
- TypeScript: passed.
- Production build: passed (184 modules; the existing >500 kB experience chunk warning remains).
- No image-generation, authoring-model, or browser-refinement call was needed for this stage.

## Exit condition

R88 is complete when a missing-asset stop produces no more than two concrete tasks, a reviewed result can resume the same job exactly once, replay cannot duplicate model work, and an unsuccessful completion stops instead of looping.

The next bounded stage is R89: one fresh idea is run end-to-end through this path, measuring wall time and checking that the page—not the internal pipeline—communicates the idea and interaction clearly.
