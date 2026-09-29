param(
  [switch]$Execute
)

$ErrorActionPreference = "Stop"

$sourceProject = [System.IO.Path]::GetFullPath("C:\Users\lenovo\Documents\Amadeus")
$desktopReport = [System.IO.Path]::GetFullPath("C:\Users\lenovo\Desktop\Amadeus项目学习报告.md")
$compareRoot = [System.IO.Path]::GetFullPath("D:\Amadeus")
$archiveRoot = [System.IO.Path]::GetFullPath("D:\Amadeus\migrated-from-c-20260816")

if ($sourceProject -ne "C:\Users\lenovo\Documents\Amadeus" -or
    $compareRoot -ne "D:\Amadeus" -or
    $archiveRoot -ne "D:\Amadeus\migrated-from-c-20260816") {
  throw "Resolved paths do not match the approved migration scope."
}

$sources = New-Object System.Collections.Generic.List[object]
if (Test-Path -LiteralPath $sourceProject -PathType Container) {
  Get-ChildItem -LiteralPath $sourceProject -File -Recurse -Force | ForEach-Object {
    $relative = $_.FullName.Substring($sourceProject.Length).TrimStart('\')
    $sources.Add([pscustomobject]@{
      File = $_
      Destination = Join-Path (Join-Path $archiveRoot "Documents-Amadeus") $relative
    })
  }
}
if (Test-Path -LiteralPath $desktopReport -PathType Leaf) {
  $desktopItem = Get-Item -LiteralPath $desktopReport -Force
  $sources.Add([pscustomobject]@{
    File = $desktopItem
    Destination = Join-Path (Join-Path $archiveRoot "Desktop") $desktopItem.Name
  })
}

if ($sources.Count -eq 0) {
  Write-Output "No approved C-drive Amadeus project files remain."
  exit 0
}

# Only same-name, same-size candidates are hashed. A missed renamed duplicate is
# conservatively copied to D instead of being discarded, so this can waste space
# but cannot lose a unique file.
$destinationIndex = @{}
Get-ChildItem -LiteralPath $compareRoot -File -Recurse -Force |
  Where-Object { -not $_.FullName.StartsWith($archiveRoot, [System.StringComparison]::OrdinalIgnoreCase) } |
  ForEach-Object {
    $key = "$($_.Name.ToLowerInvariant())|$($_.Length)"
    if (-not $destinationIndex.ContainsKey($key)) {
      $destinationIndex[$key] = New-Object System.Collections.Generic.List[string]
    }
    $destinationIndex[$key].Add($_.FullName)
  }

$hashCache = @{}
function Get-CachedHash([string]$Path) {
  if (-not $hashCache.ContainsKey($Path)) {
    try {
      $hashCache[$Path] = (Get-FileHash -LiteralPath $Path -Algorithm SHA256 -ErrorAction Stop).Hash
    } catch {
      # A running dev server can lock its log. An unreadable D candidate is
      # ignored, so the C file is preserved instead of being treated as equal.
      $hashCache[$Path] = $null
    }
  }
  return $hashCache[$Path]
}

$plannedByHash = @{}
$records = New-Object System.Collections.Generic.List[object]
foreach ($source in $sources) {
  $file = $source.File
  $sourceHash = Get-CachedHash $file.FullName
  if (-not $sourceHash) {
    throw "Source file cannot be hashed safely: $($file.FullName)"
  }
  $key = "$($file.Name.ToLowerInvariant())|$($file.Length)"
  $existingMatch = $null

  if ($destinationIndex.ContainsKey($key)) {
    foreach ($candidate in $destinationIndex[$key]) {
      if ((Get-CachedHash $candidate) -eq $sourceHash) {
        $existingMatch = $candidate
        break
      }
    }
  }

  if ($existingMatch) {
    $status = "duplicate-on-d"
    $preservedAt = $existingMatch
  } elseif ($plannedByHash.ContainsKey($sourceHash)) {
    $status = "duplicate-in-c"
    $preservedAt = $plannedByHash[$sourceHash]
  } else {
    $status = "unique-copy-to-d"
    $preservedAt = $source.Destination
    $plannedByHash[$sourceHash] = $preservedAt
  }

  $records.Add([pscustomobject]@{
    Source = $file.FullName
    Bytes = $file.Length
    Sha256 = $sourceHash
    Status = $status
    PreservedAt = $preservedAt
  })
}

$unique = @($records | Where-Object Status -eq "unique-copy-to-d")
$duplicatesOnD = @($records | Where-Object Status -eq "duplicate-on-d")
$duplicatesInC = @($records | Where-Object Status -eq "duplicate-in-c")

Write-Output "C files: $($records.Count)"
Write-Output "Already on D: $($duplicatesOnD.Count)"
Write-Output "Unique files to preserve: $($unique.Count)"
Write-Output "Additional duplicate copies inside C: $($duplicatesInC.Count)"
Write-Output "Unique bytes to copy: $(($unique | Measure-Object Bytes -Sum).Sum)"

if (-not $Execute) {
  Write-Output "DRY RUN ONLY. Unique-file sample:"
  $unique | Select-Object -First 30 Source,Bytes,PreservedAt | Format-Table -AutoSize
  exit 0
}

New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null

foreach ($record in $records) {
  if ($record.Status -eq "unique-copy-to-d") {
    $parent = Split-Path -Parent $record.PreservedAt
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    if (-not (Test-Path -LiteralPath $record.PreservedAt -PathType Leaf)) {
      Copy-Item -LiteralPath $record.Source -Destination $record.PreservedAt
    }
    $copiedHash = (Get-FileHash -LiteralPath $record.PreservedAt -Algorithm SHA256).Hash
    if ($copiedHash -ne $record.Sha256) {
      throw "Hash verification failed for $($record.Source)"
    }
  } else {
    if (-not (Test-Path -LiteralPath $record.PreservedAt -PathType Leaf)) {
      throw "Expected preserved copy is missing: $($record.PreservedAt)"
    }
    $preservedHash = (Get-FileHash -LiteralPath $record.PreservedAt -Algorithm SHA256).Hash
    if ($preservedHash -ne $record.Sha256) {
      throw "Preserved copy changed during migration: $($record.PreservedAt)"
    }
  }

  Remove-Item -LiteralPath $record.Source -Force
}

$manifestPath = Join-Path $archiveRoot "migration-manifest.csv"
$records | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8

if (Test-Path -LiteralPath $sourceProject -PathType Container) {
  Get-ChildItem -LiteralPath $sourceProject -Directory -Recurse -Force |
    Sort-Object { $_.FullName.Length } -Descending |
    ForEach-Object {
      if ((Get-ChildItem -LiteralPath $_.FullName -Force).Count -eq 0) {
        Remove-Item -LiteralPath $_.FullName -Force
      }
    }
  if ((Get-ChildItem -LiteralPath $sourceProject -Force).Count -eq 0) {
    Remove-Item -LiteralPath $sourceProject -Force
  }
}

Write-Output "Migration complete. Manifest: $manifestPath"
