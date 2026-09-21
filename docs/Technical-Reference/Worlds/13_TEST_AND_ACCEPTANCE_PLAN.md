# Test and acceptance plan

Post-separation acceptance for `Orgo_Worlds` is intentionally narrower than main Orgo acceptance.

1. `npm run check:worlds` passes.
2. `npm run validate` passes and contains no IK/main-product test dependency.
3. The standalone API starts and reads/writes `runtime/orgo-worlds-state.json`.
4. World A → B → A selection/control operations preserve independent World metadata.
5. Create r2, promote r2, and verify `current_release_id`/release metadata change without rewriting other Worlds.
6. Membership read/manage rules are exercised with deliberately colliding World-local names.
7. Static anti-drift checks fail if Interaction Kernel, intake, work, Prisma operational schema or provider adapters are copied back into this repository.

End-to-end `DecisionRecord → Signal → Case/Tasks → Impact` qualification is **not** an Orgo_Worlds acceptance test. It belongs to the Konnaxion↔Orgo integration qualification at ecosystem level.
