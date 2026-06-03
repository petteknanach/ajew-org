# Ajew.org Deployment Script
# Run this from the ajew-org folder

Write-Host "Ajew.org Deployment Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

$repoPath = "C:\Users\Pettek\.openclaw\workspace\ajew-org"

# Check if git is available
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $gitPath) {
    Write-Host "Git not found. Please install Git from https://git-scm.com" -ForegroundColor Red
    exit 1
}

Set-Location $repoPath

# Run deployment safeguards before anything can be staged or pushed
Write-Host ""
Write-Host "Running deployment safeguards..." -ForegroundColor Yellow
npm run verify
if ($LASTEXITCODE -ne 0) {
    Write-Host "Safeguards failed. Deployment blocked." -ForegroundColor Red
    exit 1
}

# Check git status
Write-Host ""
Write-Host "Checking git status..." -ForegroundColor Yellow
git status

# Add changes
Write-Host ""
Write-Host "Staging changes..." -ForegroundColor Yellow
git add -A

# Commit
Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
$message = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Add chat with Supabase + username selection + hybrid rendering"
}
git commit -m $message

# Push
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "Done! Vercel should deploy automatically." -ForegroundColor Green
