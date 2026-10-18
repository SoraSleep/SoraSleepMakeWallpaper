# Real prompt end-to-end attempt — 15/10/2026

## Request

Run a new SFW prompt through real Image Dream generation and pass the resulting image to MakeWallpaper. No mock generation or demo substitution.

Prompt: Original SFW cozy fantasy wallpaper, a tiny wooden lakeside cafe at blue hour, warm amber lanterns, pale teal lake, distant pine mountains, small glowing flowers beside the doorway, no people, no text, no logos, elegant painterly illustration, stable clean architectural geometry, quiet dark upper area for phone clock, vertical 9:16 composition, one complete finished scene.

Request projectId: e2e-lakeside-cafe-20261015. Model requested: high_aes_general_v50, 2k, 9:16, imageCount=1, mockMode=false, safety filter enabled.

## Observed result

- Started Image Dream server on loopback port 3000. Health reported ok.
- Submitted POST /api/batch/start; response accepted one prompt.
- Engine launched browser and attempted to navigate to Dreamina using its existing configured proxy.
- Navigation failed with net::ERR_TIMED_OUT.
- Generation task then failed with execution-context-destroyed during navigation.
- Final status: isRunning=false; taskStatus=failed; currentIndex=1,totalQueue=1.
- Integrations asset catalog contains no asset matching the request projectId.
- No output image was available to send to MakeWallpaper. New-prompt end-to-end quality is NOT verified.
- Engine logged a success-style batch completion message despite the failed task. This is an observed reporting defect; HTTP acceptance does not mean image generation succeeded.

No account cookies/proxy credentials are included in this report. Proxy configuration was preserved. Credit consumption was not independently verified; no successful generation was observed.

## Conclusion

Actual flow is blocked at Image Dream provider connectivity, before MakeWallpaper. Existing demo MP4/ZIP validation does not substitute for this requested run. Restore a working configured provider connection, then rerun this exact project with a new request ID and verify actual downloaded image dimensions before proceeding. A/B masked-edit capability remains a separate unverified gate.
