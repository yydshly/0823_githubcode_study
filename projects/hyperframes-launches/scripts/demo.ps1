param(
  [ValidateSet("list", "preview", "lint", "check", "render", "lint-all")]
  [string]$Action = "list",
  [string]$Project = "hyperframes-launch",
  [string]$Quality = "draft"
)

$ErrorActionPreference = "Stop"
$StudyRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$UpstreamRoot = Join-Path $StudyRoot "upstream"

function Get-DemoProjects {
  $topLevel = Get-ChildItem -LiteralPath $UpstreamRoot -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "index.html") } |
    ForEach-Object { $_.Name }

  $templates = @(
    "heygen-apple-motion/01-ui-sting",
    "heygen-apple-motion/02-bouncy-ui",
    "heygen-apple-motion/03-message-sting",
    "heygen-apple-motion/04-generate-reel",
    "heygen-apple-motion/examples/instagram",
    "heygen-apple-motion/examples/spotify",
    "heygen-apple-motion/hero"
  )

  return @($topLevel) + $templates
}

function Resolve-DemoProject([string]$Name) {
  $normalized = $Name.Replace("/", [IO.Path]::DirectorySeparatorChar)
  $candidate = [IO.Path]::GetFullPath((Join-Path $UpstreamRoot $normalized))
  if (-not $candidate.StartsWith($UpstreamRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "项目路径超出 upstream：$Name"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $candidate "index.html"))) {
    throw "找不到可运行入口：$Name"
  }
  return $candidate
}

function Invoke-HyperFrames([string]$Command, [string]$Directory, [string[]]$Extra = @()) {
  Push-Location $Directory
  try {
    & npx.cmd --yes hyperframes@latest $Command @Extra
    if ($LASTEXITCODE -ne 0) { throw "HyperFrames $Command 失败，退出码 $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

$projects = @(Get-DemoProjects | Sort-Object)

switch ($Action) {
  "list" {
    $projects | ForEach-Object { $_ }
  }
  "preview" {
    $directory = Resolve-DemoProject $Project
    Invoke-HyperFrames "preview" $directory @("--no-open")
  }
  "lint" {
    $directory = Resolve-DemoProject $Project
    Invoke-HyperFrames "lint" $directory
  }
  "check" {
    $directory = Resolve-DemoProject $Project
    Invoke-HyperFrames "check" $directory @("--snapshots")
  }
  "render" {
    $directory = Resolve-DemoProject $Project
    Invoke-HyperFrames "render" $directory @("--quality", $Quality)
  }
  "lint-all" {
    $results = foreach ($name in $projects) {
      $directory = Resolve-DemoProject $name
      Write-Host "`n=== $name ===" -ForegroundColor Cyan
      Push-Location $directory
      try {
        & npx.cmd --yes hyperframes@latest lint --json
        [PSCustomObject]@{ project = $name; exitCode = $LASTEXITCODE }
      } finally {
        Pop-Location
      }
    }
    $results | Format-Table -AutoSize
    if (($results | Where-Object exitCode -ne 0).Count -gt 0) { exit 1 }
  }
}
