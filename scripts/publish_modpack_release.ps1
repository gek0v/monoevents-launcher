#Requires -Version 5.1
<#
.SYNOPSIS
    Calcula hashes SHA-1, sube los mods a GitHub Releases en gek0v/monoevents-modpack
    y genera el archivo defaultModpack.ts con el manifiesto completo.
#>
param(
    [string]$ModsDir = "$env:APPDATA\PrismLauncher\instances\MonoCraft-2026-06-23_18-42-06\minecraft\mods",
    [string]$Repo = "gek0v/monoevents-modpack",
    [string]$Tag = "v1.0.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ModsDir)) {
    throw "No se encontró el directorio de mods en: $ModsDir"
}

$jarFiles = Get-ChildItem -LiteralPath $ModsDir -Filter "*.jar" -File | Sort-Object Name
Write-Host "Encontrados $($jarFiles.Count) mods en $ModsDir"

# Check if release exists
$releaseExists = $false
try {
    gh release view $Tag --repo $Repo 2>$null
    $releaseExists = $true
} catch {
    $releaseExists = $false
}

if (-not $releaseExists) {
    Write-Host "Creando release $Tag en $Repo..."
    gh release create $Tag --repo $Repo --title "MonoEvents Modpack $Tag" --notes "Release oficial de mods de MonoEvents Forge 1.20.1"
}

# Upload files in batches if not already present
$existingAssets = @()
try {
    $viewJson = gh release view $Tag --repo $Repo --json assets | ConvertFrom-Json
    $existingAssets = $viewJson.assets | ForEach-Object { $_.name }
} catch {
    $existingAssets = @()
}

# Batch upload files if needed
$toUpload = @()
foreach ($file in $jarFiles) {
    if ($existingAssets -notcontains $file.Name) {
        $toUpload += $file.FullName
    }
}

if ($toUpload.Count -gt 0) {
    Write-Host "Subiendo $($toUpload.Count) archivos a GitHub Releases en lotes..."
    $batchSize = 10
    for ($i = 0; $i -lt $toUpload.Count; $i += $batchSize) {
        $endIdx = [Math]::Min($i + $batchSize - 1, $toUpload.Count - 1)
        $batch = $toUpload[$i..$endIdx]
        Write-Host "Subiendo lote ($($i + 1) a $($endIdx + 1) de $($toUpload.Count))..."
        gh release upload $Tag $batch --repo $Repo --clobber
    }
}

$manifestFiles = @()

foreach ($file in $jarFiles) {
    Write-Host "Calculando hash para $($file.Name)..."
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA1).Hash.ToLower()
    $size = $file.Length
    
    $downloadUrl = "https://github.com/$Repo/releases/download/$Tag/$($file.Name)"
    $manifestFiles += [PSCustomObject]@{
        path = "mods/$($file.Name)"
        url  = $downloadUrl
        sha1 = $hash
        size = $size
        type = "custom"
    }
}

Write-Host "Generando defaultModpack.ts..."
$tsPath = Join-Path $PSScriptRoot "..\src\data\defaultModpack.ts"

$jsonFormatted = $manifestFiles | ConvertTo-Json -Depth 5

$tsContent = @"
import type { ModpackManifest } from '../types/launcher';

export const DEFAULT_MODPACK: ModpackManifest = {
  schemaVersion: 1,
  id: 'monoevents-forge-1.20.1',
  name: 'MonoEvents Halloween (1.20.1 Forge)',
  version: '1.2.0',
  minecraft: {
    version: '1.20.1',
    modloader: 'forge',
    modloaderVersion: '47.4.22',
    javaVersion: 17,
  },
  changelog: 'Modpack oficial completo de Halloween: ruletas, airdrops, Pikmins y mods de optimización.',
  files: $jsonFormatted,
};
"@

Set-Content -Path $tsPath -Value $tsContent -Encoding UTF8
Write-Host "defaultModpack.ts actualizado con éxito con $($manifestFiles.Count) mods!"
