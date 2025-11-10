# push-all-submodules.ps1
Write-Host "🚀 Pushing all submodule changes..." -ForegroundColor Cyan

# Function to push a submodule
function Push-Submodule {
    param(
        [string]$dir,
        [string]$name,
        [string]$branch
    )
    
    if (Test-Path $dir) {
        Write-Host "`n📦 Processing $name..." -ForegroundColor Yellow
        Push-Location $dir
        
        # Check current branch
        $currentBranch = git branch --show-current
        if ($currentBranch -ne $branch) {
            Write-Host "⚠️  Switching from $currentBranch to $branch" -ForegroundColor Yellow
            git checkout $branch
        }
        
        $status = git status --porcelain
        if ($status) {
            git add .
            git commit -m "Update from Claude Code"
            git push origin $branch
            Write-Host "✅ $name pushed to $branch" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  No changes in $name" -ForegroundColor Gray
        }
        
        Pop-Location
    }
}

# Push each submodule
Push-Submodule -dir "contractnest-api" -name "API" -branch "main"
Push-Submodule -dir "contractnest-ui" -name "UI" -branch "main"
Push-Submodule -dir "contractnest-edge" -name "Edge" -branch "main"
Push-Submodule -dir "ClaudeDocumentation" -name "ClaudeDocumentation" -branch "master"
Push-Submodule -dir "ContractNest-Mobile" -name "ContractNest-Mobile" -branch "main"

# Update parent repo
Write-Host "`n📝 Updating parent repo..." -ForegroundColor Yellow
$parentStatus = git status --porcelain
if ($parentStatus) {
    git add .
    git commit -m "Update submodule references"
    git push origin master
    Write-Host "✅ Parent repo updated" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No submodule reference changes" -ForegroundColor Gray
}

Write-Host "`n🎉 All done!" -ForegroundColor Green