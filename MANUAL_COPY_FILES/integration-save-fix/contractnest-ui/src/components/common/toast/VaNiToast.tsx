// src/components/common/toast/VaNiToast.tsx
import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'vani';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export const useVaNiToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useVaNiToast must be used within VaNiToastProvider');
  }
  return context;
};

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration ?? 4000;

  // Handle auto-dismiss with progress bar
  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  // Get icon and colors based on type
  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: colors.semantic.success,
          accentColor: colors.semantic.success,
          label: 'Success',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconBg: colors.semantic.error,
          accentColor: colors.semantic.error,
          label: 'Error',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: colors.semantic.warning,
          accentColor: colors.semantic.warning,
          label: 'Warning',
        };
      case 'info':
        return {
          icon: Info,
          iconBg: colors.semantic.info,
          accentColor: colors.semantic.info,
          label: 'Info',
        };
      case 'vani':
      default:
        return {
          icon: Sparkles,
          iconBg: colors.brand.primary,
          accentColor: colors.brand.primary,
          label: 'VaNi',
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={`
        relative w-[400px] p-4 rounded-2xl flex items-center gap-4 shadow-2xl overflow-hidden
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-y-full opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100'}
      `}
      style={{
        background: isDarkMode
          ? 'rgba(17, 24, 39, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      }}
    >
      {/* Icon */}
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: config.iconBg }}
        >
          <IconComponent size={20} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: isDarkMode ? '#9CA3AF' : colors.utility.secondaryText }}
        >
          {config.label}
        </p>
        <p
          className="text-sm font-semibold truncate"
          style={{ color: isDarkMode ? '#FFFFFF' : colors.utility.primaryText }}
        >
          {toast.title}
        </p>
        {toast.message && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: isDarkMode ? '#9CA3AF' : colors.utility.secondaryText }}
          >
            {toast.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 pl-4"
        style={{
          borderLeft: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleDismiss();
            }}
            className="text-xs font-bold transition-colors hover:opacity-80"
            style={{ color: config.accentColor }}
          >
            {toast.action.label}
          </button>
        )}
        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="transition-colors hover:opacity-80"
            style={{ color: isDarkMode ? '#6B7280' : colors.utility.secondaryText }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div
          className="absolute bottom-0 left-0 h-[2px] transition-all duration-50"
          style={{
            width: `${progress}%`,
            backgroundColor: config.accentColor,
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// TOAST CONTAINER
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
  position = 'bottom-right',
}) => {
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className={`fixed z-[9999] flex flex-col gap-3 ${positionClasses[position]}`}
      style={{ perspective: '1000px' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
};

// ============================================================================
// TOAST PROVIDER
// ============================================================================

interface VaNiToastProviderProps {
  children: React.ReactNode;
  position?: ToastContainerProps['position'];
  maxToasts?: number;
}

export const VaNiToastProvider: React.FC<VaNiToastProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { ...toast, id };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Remove oldest if exceeding max
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      return id;
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

// ============================================================================
// CONVENIENCE FUNCTIONS (Standalone API)
// ============================================================================

// Global toast state for standalone usage
let globalAddToast: ((toast: Omit<Toast, 'id'>) => string) | null = null;
let globalRemoveToast: ((id: string) => void) | null = null;

export const setGlobalToastHandler = (
  addHandler: (toast: Omit<Toast, 'id'>) => string,
  removeHandler?: (id: string) => void
) => {
  globalAddToast = addHandler;
  globalRemoveToast = removeHandler || null;
};

/**
 * Standalone toast function - can be used without hook
 * Requires VaNiToastProvider to be mounted with registerGlobal prop
 */
export const vaniToast = {
  show: (options: Omit<Toast, 'id' | 'type'> & { type?: ToastType }) => {
    if (!globalAddToast) {
      console.warn('VaNiToastProvider not mounted. Toast will not display.');
      return '';
    }
    return globalAddToast({ type: 'vani', ...options });
  },

  success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return vaniToast.show({ type: 'success', title, ...options });
  },

  error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return vaniToast.show({ type: 'error', title, ...options });
  },

  warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return vaniToast.show({ type: 'warning', title, ...options });
  },

  info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return vaniToast.show({ type: 'info', title, ...options });
  },

  vani: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    return vaniToast.show({ type: 'vani', title, ...options });
  },

  dismiss: (id: string) => {
    if (!globalRemoveToast) {
      console.warn('VaNiToastProvider not mounted. Cannot dismiss toast.');
      return;
    }
    globalRemoveToast(id);
  },
};

// ============================================================================
// PROVIDER WITH GLOBAL REGISTRATION
// ============================================================================

interface VaNiToastProviderWithGlobalProps extends VaNiToastProviderProps {
  registerGlobal?: boolean;
}

export const VaNiToastProviderWithGlobal: React.FC<VaNiToastProviderWithGlobalProps> = ({
  children,
  registerGlobal = true,
  ...props
}) => {
  return (
    <VaNiToastProvider {...props}>
      {registerGlobal && <GlobalToastRegistrar />}
      {children}
    </VaNiToastProvider>
  );
};

const GlobalToastRegistrar: React.FC = () => {
  const { addToast, removeToast } = useVaNiToast();

  useEffect(() => {
    setGlobalToastHandler(addToast, removeToast);
    return () => setGlobalToastHandler(null as any);
  }, [addToast, removeToast]);

  return null;
};

export default VaNiToastProvider;
