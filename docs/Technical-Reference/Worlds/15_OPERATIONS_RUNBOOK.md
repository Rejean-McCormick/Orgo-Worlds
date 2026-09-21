# Operations runbook

## State

Back up `runtime/orgo-worlds-state.json` together with the repository/configuration.
No operational Orgo task/case/signal tables belong to this repository.

## Validation

Run `npm run validate`. The architecture check fails if main-product operational
dependencies such as Interaction Kernel, intake or work modules are reintroduced.
