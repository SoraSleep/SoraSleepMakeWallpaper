# Batch stability — step02

The installed1.0.3 application completed a new50-prompt spring-landscape run through the user's Image Dream free model, Seedream4.7,2K16:9. Every prompt had exactly one generation attempt. All50 downloaded files have distinct SHA-256 hashes, native2560×1440 dimensions and pass technical QA. The test paused after three completed images, restarted its operator monitor and resumed the same batch with the original provider task identities intact.

The run reserved250credits. This is reservation accounting, not a measured wallet delta. End-to-end time was39.24minutes including quoting and the pause test; task median31.40seconds and p9535.36seconds. It is evidence for50 live generations, not500. The source contact sheet retains provider marks and is not a sale package; the visual review/export gates remain required.

## Download improvement in1.0.4

Downloaded bytes stream into a uniquely owned temporary file while SHA-256 is computed. The downloader no longer buffers and concatenates an entire image in RAM. It retries at most three times for transport errors and HTTP408/429/5xx, always using the same asset URL. It never resubmits a generation. Wrong hashes, invalid image decoding, excessive sizes, authentication failures and disk failures remain blocking. Partial files are removed; pre-existing files are never overwritten or deleted. Redirects are rejected.

Successful artifacts store bounded download attempt count and elapsed time. These fields describe local file transfer, not model generation or aesthetics.

Validation includes a64MB streamed fixture with less than48MB RSS growth, an actual pair from the live run replayed through HTTP503 and interrupted-body faults, and dispatcher tests proving retry does not add a generation or credit reservation. The50-image baseline used installed1.0.3; the new retry branch is separately fault-tested rather than spending another250credits to repeat generation.

## Reproduce

- `node scripts/batch-soak-live.mjs`: explicitly spends up to250credits in the installed application. Durable pilot state in `real-test-output/batch-soak-02/pilot.json` prevents creating another batch on restart. It stops once for a pause/restart test; rerun against that same state to resume. Completed runs do not generate again.
- `node scripts/batch-soak-review.mjs`: audits hashes, pause task identities, durations and the contact sheet without generation.
- `node scripts/batch-download-replay.mjs`: tests two existing real images against local HTTP fault injection; no generation.
- `npm run test:manager-integration`: offline regression suite, including500 simulated tasks. Simulated500 records do not constitute500 live generations.

The reports and images are local and excluded from Git. Local evidence is under `real-test-output/batch-soak-02/review.html`.
