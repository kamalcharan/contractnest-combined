#!/bin/bash
# push-all-submodules.sh
echo "🚀 Pushing all submodule changes..."

# Function to push a submodule
push_submodule() {
    local dir=$1
    local name=$2
    local branch=$3

    if [ -d "$dir" ]; then
        echo ""
        echo "📦 Processing $name..."
        cd "$dir" || return

        # Check current branch
        current_branch=$(git branch --show-current)
        if [ "$current_branch" != "$branch" ]; then
            echo "⚠️  Switching from $current_branch to $branch"
            git checkout "$branch"
        fi

        if [ -n "$(git status --porcelain)" ]; then
            git add .
            git commit -m "Update from Claude Code"
            git push origin "$branch"
            echo "✅ $name pushed to $branch"
        else
            echo "ℹ️  No changes in $name"
        fi

        cd - > /dev/null || return
    fi
}

# Push each submodule
push_submodule "contractnest-api" "API" "main"
push_submodule "contractnest-ui" "UI" "main"
push_submodule "contractnest-edge" "Edge" "main"
push_submodule "ClaudeDocumentation" "ClaudeDocumentation" "master"
push_submodule "ContractNest-Mobile" "ContractNest-Mobile" "main"

# Update parent repo
echo ""
echo "📝 Updating parent repo..."
if [ -n "$(git status --porcelain)" ]; then
    git add .
    git commit -m "Update submodule references"
    git push origin master
    echo "✅ Parent repo updated"
else
    echo "ℹ️  No submodule reference changes"
fi

echo ""
echo "🎉 All done!"
