param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 4173
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$upstreamRoot = Join-Path $projectRoot 'upstream'
$packageJson = Join-Path $upstreamRoot 'package.json'
$viteCommand = Join-Path $upstreamRoot 'node_modules\.bin\vite.cmd'
$viteConfig = Join-Path $PSScriptRoot 'vite-showcase.config.mjs'

if (-not (Test-Path -LiteralPath $packageJson)) {
  throw 'Claude-of-Tanks submodule is missing. Run git submodule update --init --depth 1.'
}

if (-not (Test-Path -LiteralPath $viteCommand)) {
  throw 'Dependencies are missing. In upstream/, run npm.cmd install --no-package-lock --no-audit --no-fund.'
}

Write-Host "Claude of Tanks demo: http://127.0.0.1:$Port/"
Write-Host "Gallery:              http://127.0.0.1:$Port/gallery?id=t90m"
Write-Host "Scene Studio:         http://127.0.0.1:$Port/studio?map=desert"
Write-Host "All-capabilities:     http://127.0.0.1:$Port/studio?map=desert&showcase=capabilities&nogate=1"
Write-Host 'Press Ctrl+C to stop.'

Push-Location $upstreamRoot
try {
  & $viteCommand --config $viteConfig --host 127.0.0.1 --port $Port --strictPort
}
finally {
  Pop-Location
}
