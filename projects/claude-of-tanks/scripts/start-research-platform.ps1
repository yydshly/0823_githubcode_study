param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4176
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$upstreamRoot = Join-Path $projectRoot 'upstream'
$packageJson = Join-Path $upstreamRoot 'package.json'
$viteCommand = Join-Path $upstreamRoot 'node_modules\.bin\vite.cmd'
$viteConfig = Join-Path $PSScriptRoot 'vite-research-platform.config.mjs'

if (-not (Test-Path -LiteralPath $packageJson)) {
  throw 'Claude-of-Tanks submodule is missing. Run git submodule update --init --depth 1.'
}

if (-not (Test-Path -LiteralPath $viteCommand)) {
  throw 'Dependencies are missing. In upstream/, run npm.cmd install --no-package-lock --no-audit --no-fund.'
}

$hubUrl = "http://127.0.0.1:$Port/research"
$workbenchUrl = "http://127.0.0.1:$Port/workbench"
$fullDemoUrl = "http://127.0.0.1:$Port/studio?map=desert&showcase=capabilities&nogate=1"
$layerLabUrl = "http://127.0.0.1:$Port/studio?map=desert&showcase=capabilities&lab=layers&nogate=1"

Write-Host "3D research platform: $hubUrl"
Write-Host "World:none product workbench: $workbenchUrl"
Write-Host "Desert capability scene: $fullDemoUrl"
Write-Host "Visual layer lab: $layerLabUrl"
Write-Host 'The blocked industrial showroom is intentionally not served by this entry.'
Write-Host 'Press Ctrl+C to stop.'

Push-Location $upstreamRoot
try {
  & $viteCommand --config $viteConfig --host 127.0.0.1 --port $Port --strictPort
}
finally {
  Pop-Location
}

