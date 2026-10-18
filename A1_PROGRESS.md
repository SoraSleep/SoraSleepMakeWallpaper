# A1 progress

Implemented: durable SFW PNG bundle intake; hash/header/dimension/path validation; idempotency conflict detection; persisted status; queued cancellation and retry; restart recovery; review source ZIP with checksum; loopback API capabilities/status/artifact.

Endpoints: GET /capabilities; POST /jobs; GET /jobs; GET /jobs/:id; POST /jobs/:id/cancel; POST /jobs/:id/retry; GET /jobs/:id/artifact. POST requires same-origin Origin and X-SoraSleep-Bridge: 1. Request is JSON manifest v1 with each asset's bytes as base64. See test fixture for exact minimum fields.

This is an intake foundation, not completion of A1. render=false and commercialReady=false are explicit. Asset checks inspect PNG headers, not full raster decode. Current packaging is synchronous; running jobs cannot be interrupted. Manager job adapter, headless render, shared image validation, bounded queue and device output verification remain required. Do not advertise a customer-ready wallpaper ZIP from this endpoint.
