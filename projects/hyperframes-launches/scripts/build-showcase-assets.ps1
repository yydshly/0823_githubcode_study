$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = (Resolve-Path (Join-Path $scriptRoot '..\..\..')).Path
$upstreamRoot = (Resolve-Path (Join-Path $scriptRoot '..\upstream')).Path
$outputRoot = Join-Path $workspaceRoot 'docs\assets\hyperframes\showcase'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$projects = @(
  @{ slug = 'heygen-stripe'; source = 'HF-heygen-stripe' },
  @{ slug = 'send-to-hyperframes'; source = 'claude-design-send-hyperframes-launch' },
  @{ slug = 'claude-paper'; source = 'claude-paper-launch' },
  @{ slug = 'cloud-render'; source = 'cloud-render-launch' },
  @{ slug = 'figma'; source = 'figma-launch' },
  @{ slug = 'framemd'; source = 'frame-md-launch-storyboard' },
  @{ slug = 'rebrand-templates'; source = 'heygen-apple-motion\01-ui-sting' },
  @{ slug = 'hyperframes-launch'; source = 'hyperframes-launch' },
  @{ slug = 'inspector'; source = 'inspector-launch' },
  @{ slug = 'kimi-k3'; source = 'k3-promo' },
  @{ slug = 'liquid-refraction'; source = 'liquid-brand-refraction' },
  @{ slug = 'pr-to-video'; source = 'pr-to-video-launch' },
  @{ slug = 'sfx-music'; source = 'sfx-music-launch' },
  @{ slug = 'spacex'; source = 'spacex-launch' },
  @{ slug = 'texture'; source = 'texture-launch-video' },
  @{ slug = 'timeline'; source = 'timeline-launch' },
  @{ slug = 'variables'; source = 'variables-launch' },
  @{ slug = 'vfx-combined'; source = 'vfx-heygen-combined' },
  @{ slug = 'website-to-video'; source = 'website-to-hyperframes' }
)

$manifest = @()
foreach ($project in $projects) {
  $renderRoot = Join-Path (Join-Path $upstreamRoot $project.source) 'renders'
  $inputFile = Get-ChildItem -LiteralPath $renderRoot -Filter '*.mp4' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $inputFile -and -not $project.source.Contains("\")) {
    $batchRenderRoot = Join-Path $workspaceRoot 'renders'
    $inputFile = Get-ChildItem -LiteralPath $batchRenderRoot -Filter "$($project.source)_*.mp4" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  }
  if ($null -eq $inputFile) {
    Write-Warning "Missing render: $($project.source)"
    continue
  }

  $durationText = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $inputFile.FullName
  $duration = [double]::Parse($durationText.Trim(), [Globalization.CultureInfo]::InvariantCulture)
  $clipDuration = [Math]::Min(8, $duration)
  $clipStart = [Math]::Max(0, ($duration - $clipDuration) / 2)
  $startText = $clipStart.ToString('0.###', [Globalization.CultureInfo]::InvariantCulture)
  $lengthText = $clipDuration.ToString('0.###', [Globalization.CultureInfo]::InvariantCulture)
  $videoOutput = Join-Path $outputRoot "$($project.slug).mp4"
  $posterOutput = Join-Path $outputRoot "$($project.slug).jpg"

  Write-Output "[clip] $($project.source) @ ${startText}s"
  & ffmpeg -hide_banner -loglevel error -y -ss $startText -i $inputFile.FullName -t $lengthText -vf "scale='min(960,iw)':-2:force_original_aspect_ratio=decrease,fps=24" -an -c:v libx264 -preset medium -crf 29 -pix_fmt yuv420p -movflags +faststart $videoOutput
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg clip failed: $($project.source)" }
  & ffmpeg -hide_banner -loglevel error -y -ss 1 -i $videoOutput -frames:v 1 -q:v 4 $posterOutput
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg poster failed: $($project.source)" }

  $manifest += [ordered]@{
    slug = $project.slug
    source = $project.source
    sourceRender = $inputFile.FullName.Substring($workspaceRoot.Length + 1)
    sourceDuration = [Math]::Round($duration, 3)
    clipStart = [Math]::Round($clipStart, 3)
    clipDuration = [Math]::Round($clipDuration, 3)
    videoBytes = (Get-Item -LiteralPath $videoOutput).Length
    posterBytes = (Get-Item -LiteralPath $posterOutput).Length
  }
}

$manifestPath = Join-Path $outputRoot 'manifest.json'
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding utf8
Write-Output "[done] $($manifest.Count)/$($projects.Count) showcase clips -> $outputRoot"
