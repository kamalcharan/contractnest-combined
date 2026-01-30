# Commit the submodule pointer updates
git add .
git commit -m "chore: update submodule references"

# Pull the 1 remote commit
git pull origin master

# Now run the script
.\scripts\push-main.ps1