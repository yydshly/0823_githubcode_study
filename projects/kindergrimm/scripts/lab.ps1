param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 8881
)

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$labEntry = Join-Path $workspaceRoot 'projects\kindergrimm\lab\index.html'
$upstreamEntry = Join-Path $workspaceRoot 'projects\kindergrimm\upstream\editor.html'

if (-not (Test-Path -LiteralPath $labEntry)) {
  throw "Kindergrimm lab entry is missing: $labEntry"
}

if (-not (Test-Path -LiteralPath $upstreamEntry)) {
  throw 'Kindergrimm submodule is missing. Run: git submodule update --init projects/kindergrimm/upstream'
}

Write-Host "Kindergrimm Lab: http://127.0.0.1:$Port/projects/kindergrimm/lab/"
python -m http.server $Port --bind 127.0.0.1 --directory $workspaceRoot
