# Launch a dedicated Edge instance Playwright can control.
# Your normal Edge / Chrome can stay open.
# First run: log in to https://campaignbot.online/templates
# Later runs: session is reused via C:\edge-automation
#
# Usage (from backend folder):
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-edge-cdp.ps1

$edge =
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (-not $edge) {
  Write-Error "Microsoft Edge not found."
  exit 1
}

$userData = "C:\edge-automation"
$port = 9222
New-Item -ItemType Directory -Force -Path $userData | Out-Null

Write-Host "Starting debug Edge on http://localhost:$port"
Write-Host "Profile: $userData"
Write-Host "Leave this window of Edge open. Log in to CampaignBot if asked."

Start-Process -FilePath $edge -ArgumentList @(
  "--remote-debugging-port=$port",
  "--user-data-dir=`"$userData`"",
  "https://campaignbot.online/templates"
)
