// src/components/Toast.tsx
// Professional Toast component with ThemeContext support

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
}

interface ToastConfig {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  defaultTitle: string;
}

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  success: {
    icon: 'check-circle',
    defaultTitle: 'Success',
  },
  error: {
    icon: 'alert-circle',
    defaultTitle: 'Error',
  },
  warning: {
    icon: 'alert',
    defaultTitle: 'Warning',
  },
  info: {
    icon: 'information',
    defaultTitle: 'Info',
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
  position = 'top',
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const colors = theme.colors;
  const config = TOAST_CONFIG[type];

  // Get colors based on toast type
  const getTypeColors = useCallback(() => {
    switch (type) {
      case 'success':
        return {
          background: isDarkMode ? 'rgba(36, 168, 145, 0.15)' : 'rgba(36, 168, 145, 0.1)',
          border: colors.semantic.success,
          icon: colors.semantic.success,
          text: isDarkMode ? '#4ADE80' : colors.semantic.success,
        };
      case 'error':
        return {
          background: isDarkMode ? 'rgba(255, 89, 99, 0.15)' : 'rgba(255, 89, 99, 0.1)',
          border: colors.semantic.error,
          icon: colors.semantic.error,
          text: isDarkMode ? '#FF6B6B' : colors.semantic.error,
        };
      case 'warning':
        return {
          background: isDarkMode ? 'rgba(252, 220, 12, 0.15)' : 'rgba(252, 220, 12, 0.1)',
          border: colors.semantic.warning,
          icon: colors.semantic.warning,
          text: isDarkMode ? '#FFD93D' : '#B8860B',
        };
      case 'info':
      default:
        return {
          background: isDarkMode ? 'rgba(111, 97, 239, 0.15)' : 'rgba(111, 97, 239, 0.1)',
          border: colors.brand.primary,
          icon: colors.brand.primary,
          text: colors.brand.primary,
        };
    }
  }, [type, isDarkMode, colors]);

  const typeColors = getTypeColors();

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset position when not visible
      translateY.setValue(position === 'top' ? -100 : 100);
      opacity.setValue(0);
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const positionStyle = position === 'top'
    ? { top: insets.top + 10 }
    : { bottom: insets.bottom + 10 };

  return (
    <Animated.View
      style={[
        styles.container,
        positionStyle,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={[
          styles.toast,
          {
            backgroundColor: typeColors.background,
            borderLeftColor: typeColors.border,
            shadowColor: typeColors.border,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={config.icon}
            size={24}
            color={typeColors.icon}
          />
        </View>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: typeColors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {message && (
            <Text
              style={[
                styles.message,
                { color: isDarkMode ? 'rgba(255,255,255,0.7)' : colors.utility.secondaryText },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={isDarkMode ? 'rgba(255,255,255,0.5)' : colors.utility.secondaryText}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Manager for imperative API
interface ToastState {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (state: ToastState) => void;

class ToastManager {
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(state: ToastState) {
    this.listeners.forEach(listener => listener(state));
  }

  show(type: ToastType, title: string, message?: string, duration?: number) {
    this.emit({ visible: true, type, title, message, duration });
  }

  success(title: string, message?: string, duration?: number) {
    this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration?: number) {
    this.show('error', title, message, duration);
  }

  warning(title: string, message?: string, duration?: number) {
    this.show('warning', title, message, duration);
  }

  info(title: string, message?: string, duration?: number) {
    this.show('info', title, message, duration);
  }

  hide() {
    this.emit({ visible: false, type: 'info', title: '' });
  }
}

export const toast = new ToastManager();

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
  });

  useEffect(() => {
    const unsubscribe = toast.subscribe(setState);
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <Toast
        visible={state.visible}
        type={state.type}
        title={state.title}
        message={state.message}
        duration={state.duration}
        onDismiss={() => setState(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
      },
      android: {
        backgroundColor: 'rgba(30, 41, 59, 0.98)',
      },
    }),
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default Toast;
