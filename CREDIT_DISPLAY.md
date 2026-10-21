# Current batch credit accounting

Version1.0.5 separates current reservation accounting from the historical preflight quotation in Landscape Batch and PLR. Current totals are derived server-side from all persisted attempts, including failed attempts, before pagination. Remaining budget means the configured run cap minus reservations; it is not the Image Dream wallet balance. No automatic refunds or changes to generation history are made.

The historical quote remains expandable and explicitly records its original estimate and expiration. It is marked current only while its reservation count, queued prompt count and expiry still match the run. Runs with no queued or submitted tasks no longer offer execution.

Validation:88 backend tests, including500-row pagination/reload accounting, plus six browser scenarios: completed, running, paused, expired quotation, no quotation and PLR. Desktop/mobile layouts pass. Tests do not generate images or use credits.

The existing50-image live batch is the installed-app check:250 reserved, zero remaining under its250 cap, no pending prompts; its old quotation is retained separately. Local evidence is under `real-test-output/credit-usage`.
