# Architecture decisions

- Keep geofence math and its demo work-zone settings in the pure `src/lib/geofence.ts` module so punch-in UI and focused tests share one boundary rule.