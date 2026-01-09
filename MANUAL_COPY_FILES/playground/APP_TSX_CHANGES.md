# App.tsx Changes for Playground Route

## 1. Add Import (around line 21, after LandingPage import)

```tsx
import LandingPage from './pages/public/LandingPage';
import PlaygroundPage from './pages/public/PlaygroundPage'; // ADD THIS LINE
import LoadingSpinner from './components/ui/LoadingSpinner';
```

## 2. Add Route (around line 301, in Public Routes section)

```tsx
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register-invitation" element={<InvitationRegisterPage />} />
          <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />  {/* ADD THIS LINE */}
```

## Quick Copy-Paste

### Import line to add:
```tsx
import PlaygroundPage from './pages/public/PlaygroundPage';
```

### Route line to add:
```tsx
<Route path="/playground" element={<PlaygroundPage />} />
```
