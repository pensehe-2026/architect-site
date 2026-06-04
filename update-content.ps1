param(
  [Parameter(Mandatory = $true)]
  [string] $Source,

  [string] $Destination = ".\data\site-content.json"
)

$ErrorActionPreference = "Stop"
$resolvedDestination = Resolve-Path -Path (Split-Path -Parent $Destination) -ErrorAction Stop
$destinationPath = Join-Path $resolvedDestination (Split-Path -Leaf $Destination)

if ($Source -match "^https?://") {
  $response = Invoke-WebRequest -Uri $Source -UseBasicParsing
  $content = $response.Content
} else {
  $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $Source
}

$parsed = $content | ConvertFrom-Json
if (-not $parsed.studioName -or -not $parsed.projects -or -not $parsed.updates) {
  throw "Content JSON must include studioName, projects, and updates."
}

$content | Set-Content -LiteralPath $destinationPath -Encoding UTF8
$jsDestinationPath = [System.IO.Path]::ChangeExtension($destinationPath, ".js")
"window.SITE_CONTENT = $content;" | Set-Content -LiteralPath $jsDestinationPath -Encoding UTF8
Write-Host "Updated $destinationPath"
Write-Host "Updated $jsDestinationPath"
