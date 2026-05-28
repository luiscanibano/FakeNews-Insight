param(
  [string]$OutputRoot,
  [string]$PackageName
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$extensionRoot = Split-Path -Parent $scriptRoot

if (-not $OutputRoot) {
  $OutputRoot = Join-Path $extensionRoot "dist"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$manifestPath = Join-Path $extensionRoot "manifest.json"
$manifestJson = [System.IO.File]::ReadAllText($manifestPath, [System.Text.Encoding]::UTF8)
$manifest = $manifestJson | ConvertFrom-Json

if (-not $PackageName) {
  $PackageName = "FakeNews-Insight-extension-v$($manifest.version)-store"
}

$packageDir = Join-Path $OutputRoot $PackageName
$zipPath = Join-Path $OutputRoot ("{0}.zip" -f $PackageName)

if (Test-Path $packageDir) {
  Remove-Item $packageDir -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null

$itemsToCopy = @(
  "background",
  "content",
  "icons",
  "lib",
  "popup"
)

foreach ($item in $itemsToCopy) {
  Copy-Item (Join-Path $extensionRoot $item) $packageDir -Recurse -Force
}

$manifest.host_permissions = @(
  $manifest.host_permissions | Where-Object {
    $_ -notin @(
      "http://127.0.0.1:8000/*",
      "http://localhost:8000/*"
    )
  }
)

$sanitizedManifestJson = ($manifest | ConvertTo-Json -Depth 10) + "`r`n"
[System.IO.File]::WriteAllText(
  (Join-Path $packageDir "manifest.json"),
  $sanitizedManifestJson,
  $utf8NoBom
)

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

Write-Host "Created store package: $zipPath"