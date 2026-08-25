param(
  [ValidateSet('draft','standard','high')]
  [string]$Quality = 'high',
  [int]$Workers = 2
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $projectRoot
try {
  npx.cmd --yes hyperframes@latest render `
    --batch batch.json `
    --output 'renders/{name}.mp4' `
    --quality $Quality `
    --resolution landscape `
    --workers $Workers `
    --batch-concurrency 1 `
    --strict-variables `
    --json `
    .
  if ($LASTEXITCODE -ne 0) { throw "HyperFrames batch render failed with exit code $LASTEXITCODE" }
}
finally {
  Pop-Location
}
