# Fix all Astro files with broken import Layout - fix newlines
$files = Get-ChildItem -Path "src\pages" -Recurse -Filter "*.astro"
$fixed = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Check for pattern: ---\nimport Layout\n
    if ($content -match "---\r?\nimport Layout\r?\n") {
        $newContent = $content -replace "(---\r?\n)import Layout(\r?\n)", "$1import Layout from '../../layouts/Layout.astro';$2"
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "Fixed: $($file.Name)"
        $fixed++
    }
}
Write-Host "Total fixed: $fixed"
