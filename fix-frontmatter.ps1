# Fix missing --- in astro frontmatter
$files = Get-ChildItem -Path "C:\Users\Pettek\.openclaw\workspace\ajew-org\src\pages" -Recurse -Filter "*.astro"
$fixed = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '(import Layout from [\'"].+?[\'"]);(\r?\n)<style>') {
        $newContent = $matches[1] + $matches[2] + "---\r\n<style>"
        $content = $content -replace '(import Layout from [\'"].+?[\'"]);(\r?\n)<style>', $newContent
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $fixed++
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "Total fixed: $fixed"
