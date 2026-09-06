param(
  [string]$Url = 'http://127.0.0.1:5173/',
  [string]$OutputDirectory = 'ui-audit/u8'
)

$browser = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browser)) { throw 'Google Chrome was not found at the expected path.' }

$root = (Resolve-Path '.').Path
$target = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force -Path $target | Out-Null

@(
  @{ Name = 'projects-1280x720.png'; Size = '1280,720' },
  @{ Name = 'projects-1440x900.png'; Size = '1440,900' },
  @{ Name = 'projects-1920x1080.png'; Size = '1920,1080' }
) | ForEach-Object {
  $profile = Join-Path $root ".chrome-u8-$($_.Size.Replace(',', 'x'))"
  $output = Join-Path $target $_.Name
  & $browser --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir=$profile --window-size=$($_.Size) --screenshot=$output $Url
  $deadline = (Get-Date).AddSeconds(10)
  while (-not (Test-Path -LiteralPath $output) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 250 }
  if (-not (Test-Path -LiteralPath $output)) { throw "Screenshot was not created: $output" }
}

Get-ChildItem -LiteralPath $target -File | Select-Object Name, Length
