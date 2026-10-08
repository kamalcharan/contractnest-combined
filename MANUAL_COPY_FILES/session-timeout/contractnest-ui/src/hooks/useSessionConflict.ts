// src/hooks/useSessionConflict.ts
//
// The per-tab "Active Session Detected" check is retired. The login lives in
// localStorage and is shared by every tab on the browser, so two tabs are the
// same session by design; a different person logging in clears the previous
// login (AuthContext.clearPreviousSession) and 15 minutes of inactivity logs
// out every tab (utils/auth/sessionActivity). There is nothing left to
// conflict. The hook stays so its callers keep compiling and always reports
// no conflict.

export const useSessionConflict = () => {
  const clearSessionConflict = () => {};
  return { hasSessionConflict: false, clearSessionConflict };
};
