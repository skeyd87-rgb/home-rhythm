$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8787
$nodeCandidates = @(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
  "node.exe"
)

$node = $nodeCandidates | Where-Object {
  if ($_ -eq "node.exe") {
    Get-Command $_ -ErrorAction SilentlyContinue
  } else {
    Test-Path $_
  }
} | Select-Object -First 1

if (-not $node) {
  Write-Host "Node.js was not found. Please install Node.js or open this folder in Codex again."
  Read-Host "Press Enter to close"
  exit 1
}

$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if (-not $connection) {
  Start-Process -FilePath $node -ArgumentList @("server.js") -WorkingDirectory $root -WindowStyle Hidden
  Start-Sleep -Seconds 1
}

Start-Process "http://127.0.0.1:$port/index.html"
