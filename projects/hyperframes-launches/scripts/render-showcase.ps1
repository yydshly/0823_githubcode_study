param(
  [ValidateRange(0, 2)]
  [int]$Group = 0,

  [ValidateRange(1, 3)]
  [int]$Groups = 3
)

$ErrorActionPreference = 'Continue'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptRoot '..\upstream')).Path

$projects = @(
  'HF-heygen-stripe',
  'claude-design-send-hyperframes-launch',
  'claude-paper-launch',
  'cloud-render-launch',
  'figma-launch',
  'frame-md-launch-storyboard',
  'hyperframes-launch',
  'inspector-launch',
  'k3-promo',
  'liquid-brand-refraction',
  'pr-to-video-launch',
  'sfx-music-launch',
  'spacex-launch',
  'texture-launch-video',
  'timeline-launch',
  'variables-launch',
  'vfx-heygen-combined',
  'website-to-hyperframes'
)

$selected = for ($index = 0; $index -lt $projects.Count; $index++) {
  if (($index % $Groups) -eq $Group) { $projects[$index] }
}

Write-Output "[group $Group/$Groups] $($selected.Count) projects"

foreach ($name in $selected) {
  $directory = Join-Path $projectRoot $name
  $renderDirectory = Join-Path $directory 'renders'
  $existing = Get-ChildItem -LiteralPath $renderDirectory -Filter '*.mp4' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($null -ne $existing -and $existing.Length -gt 1024) {
    Write-Output "[skip] $name -> $($existing.Name)"
    continue
  }

  Write-Output "[render] $name"
  Push-Location $directory
  try {
    & npx.cmd --yes hyperframes@latest render --quality draft --workers 4 --quiet .
  } finally {
    Pop-Location
  }
  if ($LASTEXITCODE -eq 0) {
    $output = Get-ChildItem -LiteralPath $renderDirectory -Filter '*.mp4' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($null -ne $output) {
      Write-Output "[ok] $name -> $($output.Name) ($($output.Length) bytes)"
    } else {
      Write-Output "[fail] $name -> command succeeded but no MP4 was found"
    }
  } else {
    Write-Output "[fail] $name -> exit $LASTEXITCODE"
  }
}

Write-Output "[done] group $Group"
