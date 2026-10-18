$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
node scripts/runtime-check.mjs
if ($LASTEXITCODE -ne 0) { throw 'Runtime check failed. Configure runtime.local.json and start Image Dream, then try again.' }
node scripts/studio-launch.mjs
