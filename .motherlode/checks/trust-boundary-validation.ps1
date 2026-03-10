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
if ($null -eq $activation -or $null -eq $activation.enabled_rules -or -not [bool]$activation.enabled_rules.trust_boundary_validation) {
  return
}

$requiredPatterns = @(
  @{ Path = 'extension/src/validation.ts'; Pattern = 'export function normalizeHostname'; Label = 'hostname normalization utility' },
  @{ Path = 'extension/src/validation.ts'; Pattern = 'export function validatePolicyConfig'; Label = 'policy validation utility' },
  @{ Path = 'extension/src/background.ts'; Pattern = 'normalizeHostname\(req\.host\)'; Label = 'hostname validation in background resolver' },
  @{ Path = 'extension/src/background.ts'; Pattern = 'validatePolicyConfig\(req\.config\)'; Label = 'config validation on set_config' },
  @{ Path = 'extension/src/background.ts'; Pattern = 'validatePolicyConfig\(storedConfig\)'; Label = 'config validation on storage load' },
  @{ Path = 'extension/src/content.ts'; Pattern = 'normalizeHostname\(window\.location\.hostname\)'; Label = 'hostname normalization in content script' },
  @{ Path = 'extension/src/content.ts'; Pattern = 'script\.remove\(\)'; Label = 'spoofing script removal after injection' },
  @{ Path = 'extension/src/content.ts'; Pattern = 'void initialize\(\)'; Label = 'immediate startup at document_start' }
)

$missing = New-Object System.Collections.Generic.List[string]
foreach ($entry in $requiredPatterns) {
  $path = Join-Path $RepoRoot $entry.Path
  if (-not (Test-Path $path)) {
    $missing.Add("missing file $($entry.Path)") | Out-Null
    continue
  }

  $content = Get-Content -Path $path -Raw
  if ($content -notmatch $entry.Pattern) {
    $missing.Add($entry.Label) | Out-Null
  }
}

$contentPath = Join-Path $RepoRoot 'extension/src/content.ts'
$contentScript = if (Test-Path $contentPath) { Get-Content -Path $contentPath -Raw } else { '' }
if ($contentScript -match 'DOMContentLoaded') {
  $missing.Add('DOMContentLoaded delay removed from content bootstrap') | Out-Null
}

$threatModelPath = Join-Path $RepoRoot 'docs/THREAT_MODEL.md'
$threatModelOk = (Test-Path $threatModelPath) -and ((Get-Content -Path $threatModelPath -Raw) -match 'Attack Surfaces')
if (-not $threatModelOk) {
  $missing.Add('documented trust boundary threat model') | Out-Null
}

$passed = ($missing.Count -eq 0)
$evidence = if ($passed) {
  'validated hostnames and policy config before persona resolution and script injection'
}
else {
  'missing: ' + ($missing -join ', ')
}

[pscustomobject]@{
  id = 'trust.boundary_validation'
  category = 'security'
  passed = $passed
  evidence = $evidence
  remediation = 'Validate runtime message inputs, normalize hostnames, inject immediately at document_start, and minimize page-exposed spoofing state.'
  weight = 4
}
