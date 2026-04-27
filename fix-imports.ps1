$files = Get-ChildItem -Path "src\pages\teachings" -Filter "*.astro" | Where-Object { (Get-Content $_.FullName -Raw) -match "\n---\s*\nimport Layout\s*$" }
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "^(---[\s\S]*?)(\n---\s*\n)(import Layout\s*)$") {
        $newContent = $matches[1] + "---\nimport Layout from '../../layouts/Layout.astro';" + "`n" + $matches[3]
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}
