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
if ($null -eq $activation -or $null -eq $activation.enabled_rules -or -not [bool]$activation.enabled_rules.sensitive_logging) {
  return
}

$forbiddenPatterns = @($activation.repo_specific_overrides.forbidden_log_patterns)
if ($forbiddenPatterns.Count -eq 0) {
  $forbiddenPatterns = @(
    'console\.log\(',
    'Initialized with config:',
    'User-Agent header:',
    'Accept-Language header:'
  )
}

$runtimeFiles = Get-ChildItem -Path (Join-Path $RepoRoot 'extension/src'), (Join-Path $RepoRoot 'extension/ui') -Recurse -File -Include *.ts | Where-Object { $_.Name -notmatch '\.test\.ts$' }
$violations = New-Object System.Collections.Generic.List[string]

foreach ($file in $runtimeFiles) {
  $content = Get-Content -Path $file.FullName -Raw
  foreach ($pattern in $forbiddenPatterns) {
    if ($content -match [string]$pattern) {
      $relativePath = $file.FullName.Replace($RepoRoot, '.').TrimStart('.')
      $violations.Add("$relativePath matches $pattern") | Out-Null
    }
  }
}

$loggingPath = Join-Path $RepoRoot 'core/src/logging.rs'
if (Test-Path $loggingPath) {
  $loggingContent = Get-Content -Path $loggingPath -Raw
  $disallowedFields = @('user_agent', 'accept_language', 'timezone', 'screen')
  foreach ($field in $disallowedFields) {
    if ($loggingContent -match "pub\s+$field\s*:") {
      $violations.Add("core/src/logging.rs exposes disallowed log field $field") | Out-Null
    }
  }
}
else {
  $violations.Add('missing core/src/logging.rs') | Out-Null
}

$passed = ($violations.Count -eq 0)
$evidence = if ($passed) {
  'runtime logging avoids config dumps and raw spoofed header values'
}
else {
  'violations: ' + ($violations -join ', ')
}

[pscustomobject]@{
  id = 'logging.sensitive'
  category = 'security'
  passed = $passed
  evidence = $evidence
  remediation = 'Log only high-level persona and host events; do not log full configs or raw spoofed header values.'
  weight = 4
}
