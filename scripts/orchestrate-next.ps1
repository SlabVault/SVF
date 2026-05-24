# SlabVaultFi autonomous orchestration loop (Windows)
#
# Usage:
#   .\scripts\orchestrate-next.ps1
#   .\scripts\orchestrate-next.ps1 -IntervalMinutes 15
#   .\scripts\orchestrate-next.ps1 -Lane security
#   .\scripts\orchestrate-next.ps1 -RunOnce
#
# Emits AGENT_LOOP_TICK with a JSON prompt payload every interval.
# Cursor agents with monitored shell output can wake on that sentinel.

param(
  [int]$IntervalMinutes = 30,
  [string]$Lane = "",
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Get-NextTaskPayload {
  param([string]$LaneFilter)

  $args = @("run", "orchestrate:next", "--silent")
  if ($LaneFilter) {
    $args += @("--", "--lane", $LaneFilter)
  }

  $raw = & npm @args 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "orchestrate:next failed:`n$raw"
  }

  return $raw.Trim()
}

function Emit-AgentLoopTick {
  param([string]$PayloadJson)

  try {
    $parsed = $PayloadJson | ConvertFrom-Json
    $prompt = $parsed.task.prompt
    if (-not $prompt) {
      $prompt = "No open backlog task. Run npm run orchestrate:investigate and update docs/STATUS.md."
    }

    $envelope = @{
      prompt = $prompt
      task = $parsed.task
      generatedAt = $parsed.generatedAt
    } | ConvertTo-Json -Compress

    Write-Output "AGENT_LOOP_TICK $envelope"
  }
  catch {
    $fallback = @{
      prompt = "Orchestrator parse error. Inspect scripts/cursor-sdk/autonomous-loop.ts output."
      raw = $PayloadJson
    } | ConvertTo-Json -Compress

    Write-Output "AGENT_LOOP_TICK $fallback"
  }
}

Write-Host "SlabVaultFi orchestrator armed (interval=${IntervalMinutes}m, lane='$Lane', runOnce=$RunOnce)"

if ($RunOnce) {
  $payload = Get-NextTaskPayload -LaneFilter $Lane
  Emit-AgentLoopTick -PayloadJson $payload
  exit 0
}

while ($true) {
  Start-Sleep -Seconds ($IntervalMinutes * 60)
  try {
    $payload = Get-NextTaskPayload -LaneFilter $Lane
    Emit-AgentLoopTick -PayloadJson $payload
  }
  catch {
    $errorEnvelope = @{
      prompt = "Orchestrator tick failed: $($_.Exception.Message). Fix npm run orchestrate:next and retry."
    } | ConvertTo-Json -Compress
    Write-Output "AGENT_LOOP_TICK $errorEnvelope"
  }
}
