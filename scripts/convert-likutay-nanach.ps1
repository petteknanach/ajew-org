# Convert Likutay Nanach DOCX files to text
$docxPath = "C:\Users\Pettek\Documents\Likutay Nanach"
$outputPath = "C:\Users\Pettek\.openclaw\workspace\ajew-org\public\books\likutay-nanach"

# Create output directory
New-Item -ItemType Directory -Force -Path $outputPath

# List all DOCX files
$docxFiles = Get-ChildItem -Path $docxPath -Filter "*.docx"

Write-Host "Found $($docxFiles.Count) Likutay Nanach volumes:" -ForegroundColor Green
$docxFiles | ForEach-Object { Write-Host "  - $($_.Name)" }

# Function to extract text from DOCX (simple approach)
function Extract-DocxText($docxFile) {
    $tempDir = Join-Path $env:TEMP "docx_extract_$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $tempDir
    
    # Copy and rename to ZIP
    $zipFile = Join-Path $tempDir "document.zip"
    Copy-Item $docxFile.FullName $zipFile
    
    # Extract ZIP
    Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
    
    # Read document.xml
    $xmlPath = Join-Path $tempDir "word\document.xml"
    if (Test-Path $xmlPath) {
        $content = Get-Content $xmlPath -Raw
        # Simple extraction of text between <w:t> tags
        $text = [regex]::Matches($content, '<w:t[^>]*>([^<]+)</w:t>') | 
                ForEach-Object { $_.Groups[1].Value } | 
                Where-Object { $_ -notmatch '^\s*$' }
        
        # Clean up
        Remove-Item $tempDir -Recurse -Force
        
        return ($text -join " ")
    }
    
    # Clean up
    Remove-Item $tempDir -Recurse -Force
    return ""
}

# Process each volume
$volumes = @()
foreach ($file in $docxFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $volumeNumber = if ($file.Name -match 'vol (\d)') { $matches[1] } else { "unknown" }
    $volumeName = "Likutay Nanach Volume $volumeNumber"
    
    $text = Extract-DocxText $file
    
    # Save raw text
    $textFile = Join-Path $outputPath "volume-$volumeNumber-raw.txt"
    $text | Out-File -FilePath $textFile -Encoding UTF8
    
    # Create volume info
    $volume = @{
        Number = $volumeNumber
        Name = $volumeName
        FileName = $file.Name
        TextFile = $textFile
        TextLength = $text.Length
        Chapters = @()
    }
    
    $volumes += $volume
    
    Write-Host "  Extracted $($text.Length) characters" -ForegroundColor Green
}

# Save volumes info
$volumesJson = ConvertTo-Json $volumes -Depth 3
$volumesJson | Out-File -FilePath (Join-Path $outputPath "volumes-info.json") -Encoding UTF8

Write-Host "`nConversion complete!" -ForegroundColor Green
Write-Host "Output saved to: $outputPath" -ForegroundColor Green