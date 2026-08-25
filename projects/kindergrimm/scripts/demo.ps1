param(
  [ValidateSet('list', 'serve')]
  [string]$Action = 'list',
  [ValidateRange(1024, 65535)]
  [int]$Port = 8137
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$upstream = Join-Path $projectRoot 'upstream'

if (-not (Test-Path -LiteralPath (Join-Path $upstream 'serve.py'))) {
  throw "Kindergrimm submodule is missing. Run: git submodule update --init projects/kindergrimm/upstream"
}

$entries = @(
  [pscustomobject]@{ Route = '/orla'; Category = 'game'; Capability = 'Class Photo poker-style scoring' }
  [pscustomobject]@{ Route = '/game'; Category = 'game'; Capability = 'Dark-floor squad game and procedural items' }
  [pscustomobject]@{ Route = '/marbles'; Category = 'game'; Capability = 'Drag-launch marble auto-combat' }
  [pscustomobject]@{ Route = '/editor'; Category = 'drawn 2D'; Capability = 'Recipe, parts, poses and expressions' }
  [pscustomobject]@{ Route = '/crowd'; Category = 'drawn 2D'; Capability = '35 live procedural characters' }
  [pscustomobject]@{ Route = '/items'; Category = 'drawn 2D'; Capability = 'Item families by rank contact sheet' }
  [pscustomobject]@{ Route = '/how'; Category = 'teaching'; Capability = '11 live generator stages' }
  [pscustomobject]@{ Route = '/voxel'; Category = 'voxel 3D'; Capability = 'Recipe-driven voxel character lab' }
  [pscustomobject]@{ Route = '/voxelcrowd'; Category = 'voxel 3D'; Capability = '20-character moonlit crowd' }
  [pscustomobject]@{ Route = '/gloss'; Category = 'gloss 3D'; Capability = 'Solid chibi character lab' }
  [pscustomobject]@{ Route = '/glosscrowd'; Category = 'gloss 3D'; Capability = '35-character reactive sheet' }
  [pscustomobject]@{ Route = '/photo'; Category = 'gloss 3D'; Capability = 'Seeded class portrait composition' }
  [pscustomobject]@{ Route = '/objects'; Category = 'object 3D'; Capability = 'Procedural plant object lab' }
  [pscustomobject]@{ Route = '/pipes'; Category = 'experiment'; Capability = 'Living three-layer schematic' }
)

if ($Action -eq 'list') {
  $entries | Format-Table -AutoSize
  return
}

Push-Location $upstream
try {
  Write-Host "Kindergrimm: http://127.0.0.1:$Port/"
  python serve.py $Port
}
finally {
  Pop-Location
}
