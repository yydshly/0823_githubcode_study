param(
  [ValidateSet('list', 'serve')]
  [string]$Action = 'list',
  [ValidateRange(1024, 65535)]
  [int]$Port = 8143
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$upstreamIndex = Join-Path $projectRoot 'upstream\index.html'
$labRoot = Join-Path $projectRoot 'lab'
$labPackage = Join-Path $labRoot 'package.json'

if (-not (Test-Path -LiteralPath $upstreamIndex)) {
  throw 'Kage submodule is missing. Run: git submodule update --init projects/kage/upstream'
}

if (-not (Test-Path -LiteralPath $labPackage)) {
  throw 'Signal Story Lab is missing its package.json.'
}

$entries = @(
  [pscustomobject]@{ Route = '/upstream/'; Category = 'upstream'; Capability = 'Original five-chapter scroll-driven Three.js experience' }
  [pscustomobject]@{ Route = '/upstream/?shot=0'; Category = 'review'; Capability = 'Deterministic hero review state; shot accepts 0 through 5' }
  [pscustomobject]@{ Route = '/upstream/?q=low'; Category = 'quality'; Capability = 'Low quality profile used by coarse-pointer devices' }
  [pscustomobject]@{ Route = '/upstream/?post=0'; Category = 'rendering'; Capability = 'Direct render path without the custom post-processing chain' }
  [pscustomobject]@{ Route = '/upstream/?nogl=1'; Category = 'fallback'; Capability = 'Readable DOM fallback with WebGL disabled' }
  [pscustomobject]@{ Route = '/lab/dist/'; Category = 'extension'; Capability = 'Original configuration-driven cinematic story laboratory' }
  [pscustomobject]@{ Route = '/lab/dist/?story=archive&chapter=1'; Category = 'configuration'; Capability = 'A second story and world preset with the same runtime' }
  [pscustomobject]@{ Route = '/lab/dist/?renderer=none'; Category = 'fallback'; Capability = 'Lab semantic fallback without WebGL' }
)

if ($Action -eq 'list') {
  $entries | Format-Table -AutoSize
  return
}

if (-not (Test-Path -LiteralPath (Join-Path $labRoot 'node_modules'))) {
  throw 'Lab dependencies are missing. Run: npm.cmd ci --prefix projects/kage/lab'
}

Write-Host 'Building Signal Story Lab...'
Push-Location $labRoot
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Lab build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "Kage research hub: http://127.0.0.1:$Port/"
Write-Host "Original Kage:      http://127.0.0.1:$Port/upstream/"
Write-Host "Extension lab:      http://127.0.0.1:$Port/lab/dist/"

python -m http.server $Port --bind 127.0.0.1 --directory $projectRoot
