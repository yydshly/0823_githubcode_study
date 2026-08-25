param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 8882
)

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$factoryEntry = Join-Path $workspaceRoot 'projects\kindergrimm\npc-factory\index.html'
$upstreamEntry = Join-Path $workspaceRoot 'projects\kindergrimm\upstream\src\rig.js'

if (-not (Test-Path -LiteralPath $factoryEntry)) {
  throw "NPC factory entry is missing: $factoryEntry"
}

if (-not (Test-Path -LiteralPath $upstreamEntry)) {
  throw 'Kindergrimm submodule is missing. Run: git submodule update --init projects/kindergrimm/upstream'
}

Write-Host "NPC Asset Factory: http://127.0.0.1:$Port/projects/kindergrimm/npc-factory/"
Write-Host "NPC Runtime Scenarios: http://127.0.0.1:$Port/projects/kindergrimm/npc-scenarios/?seed=240824"
python -m http.server $Port --bind 127.0.0.1 --directory $workspaceRoot
