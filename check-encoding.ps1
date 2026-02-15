$bytes = [System.IO.File]::ReadAllBytes("public/books/1_ספרי רבי נחמן/01_ליקוטי מוהר''ן.txt")
$bytes[0..50] | ForEach-Object { Write-Host ("{0:X2}" -f $_) -NoNewline; Write-Host " " -NoNewline }
Write-Host
Write-Host "UTF-8 decode:"
[System.Text.Encoding]::UTF8.GetString($bytes[0..200])
Write-Host "CP1255 decode:"
[System.Text.Encoding]::GetEncoding(1255).GetString($bytes[0..200])
