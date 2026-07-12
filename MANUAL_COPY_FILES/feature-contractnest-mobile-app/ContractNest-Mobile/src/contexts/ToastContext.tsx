// src/contexts/ToastContext.tsx
// App-wide toast notifications: themed, animated, auto-dismissing.
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

interface ToastItem extends Required<Omit<ToastOptions, 'message'>> {
  id: number;
  message?: string;
}

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        onDismiss(toast.id)
      );
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, opacity, toast.durationMs, toast.id, translateY]);

  const color = theme.colors.semantic[toast.type];

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <Pressable
        onPress={() => onDismiss(toast.id)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.utility.secondaryBackground,
            borderLeftColor: color,
            shadowColor: '#000',
          },
        ]}
      >
        <MaterialCommunityIcons name={ICONS[toast.type]} size={22} color={color} style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.colors.utility.primaryText }]} numberOfLines={2}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={[styles.message, { color: theme.colors.utility.secondaryText }]} numberOfLines={3}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    const toast: ToastItem = {
      id: idRef.current,
      type: options.type ?? 'info',
      title: options.title,
      message: options.message,
      durationMs: options.durationMs ?? 3500,
    };
    setToasts((prev) => [...prev.slice(-2), toast]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: { marginRight: 10, marginTop: 1 },
  textWrap: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '700' },
  message: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
