# Implementation checklist

- [x] Standalone World registry
- [x] WorldRelease lifecycle
- [x] WorldMembership and permissions
- [x] Standalone API/UI tooling
- [x] Main Orgo operational engine removed
- [x] Interaction Kernel operational boundary removed from Orgo_Worlds
- [x] Static anti-drift validation
- [ ] Replace JSON control-plane store only if a dedicated Worlds persistence decision is made

`Signal`, `WorkflowVersion`, `Case`, `Task`, `IntegrationOperation` and the Orgo
outbox are deliberately outside this checklist because they are owned by `Orgo`.
