# A4 — sales bundle foundation

Implemented buildSalesBundle and POST /sales-bundle (same-origin loopback). Requires SFW scope, title, seller, support, SKU, version, license, description, AI disclosure and supplied artifacts with SHA-256. Rejects placeholder seller/license text, duplicate/unsafe paths and excessive payload. Outputs Customer, Listing and QA folders, README/license/changelog/checksums and needs_review report.

Artifacts are supplied, not generated or decoded by this module. No automatic commercial, rights, SFW or device approval. Metadata explicitly reports pending checks. ZIP is returned to caller; not yet persisted as a Manager product.

A4 remains incomplete: UI product form, generated thumbnail/contact sheet/watermarked teaser/mockup from real renders, durable product review, revision-linked A3 outputs, Manager artifact registration and actual installer testing. Requires A3 renderer/export gates first. Tests validate packaging structure, checksum rejection and path rules only.
