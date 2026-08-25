param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4175
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$upstreamRoot = Join-Path $projectRoot 'upstream'
$packageJson = Join-Path $upstreamRoot 'package.json'
$viteCommand = Join-Path $upstreamRoot 'node_modules\.bin\vite.cmd'
$viteConfig = Join-Path $PSScriptRoot 'vite-reuse-showroom.config.mjs'

if (-not (Test-Path -LiteralPath $packageJson)) {
  throw 'Claude-of-Tanks submodule is missing. Run git submodule update --init --depth 1.'
}

if (-not (Test-Path -LiteralPath $viteCommand)) {
  throw 'Dependencies are missing. In upstream/, run npm.cmd install --no-package-lock --no-audit --no-fund.'
}

$showroomUrl = "http://127.0.0.1:$Port/studio?map=desert&showcase=industrial-showroom&nogate=1"
Write-Host "Industrial showroom: $showroomUrl"
Write-Host 'Press Ctrl+C to stop.'

Push-Location $upstreamRoot
try {
  & $viteCommand --config $viteConfig --host 127.0.0.1 --port $Port --strictPort
}
finally {
  Pop-Location
}
