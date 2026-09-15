$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\CHECK_BEFORE_COPY.ps1"
Set-Location (Join-Path $PSScriptRoot '..\..')
New-Item -ItemType Directory -Force -Path 'contractnest-ui\src\utils\navigation' | Out-Null
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\App.tsx" -Destination "contractnest-ui\src\App.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\context\AuthContext.tsx" -Destination "contractnest-ui\src\context\AuthContext.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\auth\ProtectedRoute.tsx" -Destination "contractnest-ui\src\components\auth\ProtectedRoute.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\auth\LoginPage.tsx" -Destination "contractnest-ui\src\pages\auth\LoginPage.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\auth\GoogleCallbackPage.tsx" -Destination "contractnest-ui\src\pages\auth\GoogleCallbackPage.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\auth\SelectTenantPage.tsx" -Destination "contractnest-ui\src\pages\auth\SelectTenantPage.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\layout\TenantSwitcher.tsx" -Destination "contractnest-ui\src\components\layout\TenantSwitcher.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\layout\MainLayout.tsx" -Destination "contractnest-ui\src\components\layout\MainLayout.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\layout\navigation.css" -Destination "contractnest-ui\src\components\layout\navigation.css" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\utils\constants\industryMenus.ts" -Destination "contractnest-ui\src\utils\constants\industryMenus.ts" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\experience\index.tsx" -Destination "contractnest-ui\src\pages\experience\index.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\experience\experience.css" -Destination "contractnest-ui\src\pages\experience\experience.css" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\utils\navigation\entry.ts" -Destination "contractnest-ui\src\utils\navigation\entry.ts" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\utils\navigation\EntryRedirect.tsx" -Destination "contractnest-ui\src\utils\navigation\EntryRedirect.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\utils\navigation\verify.mjs" -Destination "contractnest-ui\src\utils\navigation\verify.mjs" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\onboarding\OnboardingLayout.tsx" -Destination "contractnest-ui\src\components\onboarding\OnboardingLayout.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\contexts\OnboardingContext.tsx" -Destination "contractnest-ui\src\contexts\OnboardingContext.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\onboarding\OnboardingPendingPage.tsx" -Destination "contractnest-ui\src\pages\onboarding\OnboardingPendingPage.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\pages\onboarding\steps\CompleteStep.tsx" -Destination "contractnest-ui\src\pages\onboarding\steps\CompleteStep.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\lite\onboarding\PlanStep.tsx" -Destination "contractnest-ui\src\lite\onboarding\PlanStep.tsx" -Force
Copy-Item "MANUAL_COPY_FILES\ux-journey-s1-r5\contractnest-ui\src\components\layout\Sidebar.tsx" -Destination "contractnest-ui\src\components\layout\Sidebar.tsx" -Force
Write-Host 'Copied - restart UI dev server, then log in normally.' -ForegroundColor Green
