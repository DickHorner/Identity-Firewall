param(
  [string]$RepoRoot,
  [string]$ConfigPath,
  [string]$ActivationProfilePath
)

$ErrorActionPreference = 'Stop'

function Get-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  Get-Content -Path $Path -Raw | ConvertFrom-Json -Depth 20
}

$activation = Get-JsonFile -Path $ActivationProfilePath
if ($null -eq $activation -or $null -eq $activation.enabled_rules -or -not [bool]$activation.enabled_rules.architecture_boundaries) {
  return
}

$extensionFiles = Get-ChildItem -Path (Join-Path $RepoRoot 'extension/src'), (Join-Path $RepoRoot 'extension/ui') -Recurse -File -Include *.ts,*.html
$coreFiles = Get-ChildItem -Path (Join-Path $RepoRoot 'core/src') -Recurse -File -Include *.rs

$violations = New-Object System.Collections.Generic.List[string]

foreach ($file in $extensionFiles) {
  $content = Get-Content -Path $file.FullName -Raw
  if ($content -match '(from\s+["''][^"'']*core/)|(require\([^\)]*core/)') {
    $relativePath = $file.FullName.Replace($RepoRoot, '.').TrimStart('.')
    $violations.Add("$relativePath imports core sources directly") | Out-Null
  }
}

foreach ($file in $coreFiles) {
  $content = Get-Content -Path $file.FullName -Raw
  if ($content -match '\b(chrome|window|document|navigator)\.' -or $content -match 'webRequest') {
    $relativePath = $file.FullName.Replace($RepoRoot, '.').TrimStart('.')
    $violations.Add("$relativePath depends on browser APIs") | Out-Null
  }
}

$architectureDocPath = Join-Path $RepoRoot 'docs/ARCHITECTURE.md'
$architectureDocOk = (Test-Path $architectureDocPath) -and ((Get-Content -Path $architectureDocPath -Raw) -match 'Boundary Enforcement')
if (-not $architectureDocOk) {
  $violations.Add('docs/ARCHITECTURE.md documents boundary enforcement') | Out-Null
}

$passed = ($violations.Count -eq 0)
$evidence = if ($passed) {
  'core remains browser-agnostic and extension remains source-isolated from core internals'
}
else {
  'violations: ' + ($violations -join ', ')
}

[pscustomobject]@{
  id = 'architecture.boundaries'
  category = 'maintainability'
  passed = $passed
  evidence = $evidence
  remediation = 'Keep the Rust core browser-agnostic, avoid direct extension-to-core source imports, and document the boundary contract.'
  weight = 3
}
