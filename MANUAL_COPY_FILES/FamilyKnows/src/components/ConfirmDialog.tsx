// src/components/ConfirmDialog.tsx
// Professional themed confirmation dialog component

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface DialogButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ConfirmDialogProps {
  visible: boolean;
  type?: DialogType;
  title: string;
  message?: string;
  buttons?: DialogButton[];
  onClose: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

const DIALOG_CONFIG: Record<DialogType, {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColorKey: 'success' | 'error' | 'warning' | 'info' | 'primary';
}> = {
  info: { icon: 'information', iconColorKey: 'info' },
  success: { icon: 'check-circle', iconColorKey: 'success' },
  warning: { icon: 'alert', iconColorKey: 'warning' },
  error: { icon: 'alert-circle', iconColorKey: 'error' },
  confirm: { icon: 'help-circle', iconColorKey: 'primary' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  type = 'confirm',
  title,
  message,
  buttons,
  onClose,
  icon,
}) => {
  const { theme, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const config = DIALOG_CONFIG[type];
  const displayIcon = icon || config.icon;

  // Get icon color based on type
  const getIconColor = () => {
    switch (config.iconColorKey) {
      case 'success':
        return theme.colors.semantic.success;
      case 'error':
        return theme.colors.semantic.error;
      case 'warning':
        return theme.colors.semantic.warning;
      case 'info':
        return theme.colors.brand.secondary;
      case 'primary':
      default:
        return theme.colors.brand.primary;
    }
  };

  const iconColor = getIconColor();
  const iconBgColor = iconColor + '15';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const defaultButtons: DialogButton[] = [
    { text: 'OK', onPress: handleClose, style: 'default' },
  ];

  const dialogButtons = buttons || defaultButtons;

  const getButtonStyle = (style?: 'default' | 'cancel' | 'destructive') => {
    switch (style) {
      case 'cancel':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.utility.secondaryText + '40',
        };
      case 'destructive':
        return {
          backgroundColor: theme.colors.semantic.error,
        };
      default:
        return {
          backgroundColor: theme.colors.brand.primary,
        };
    }
  };

  const getButtonTextColor = (style?: 'default' | 'cancel' | 'destructive') => {
    switch (style) {
      case 'cancel':
        return theme.colors.utility.primaryText;
      case 'destructive':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          { opacity: opacityAnim },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: isDarkMode
                ? theme.colors.utility.secondaryBackground
                : theme.colors.utility.primaryBackground,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons
              name={displayIcon}
              size={32}
              color={iconColor}
            />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: theme.colors.utility.primaryText },
            ]}
          >
            {title}
          </Text>

          {/* Message */}
          {message && (
            <Text
              style={[
                styles.message,
                { color: theme.colors.utility.secondaryText },
              ]}
            >
              {message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {dialogButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  dialogButtons.length > 1 && { flex: 1 },
                ]}
                onPress={() => {
                  handleClose();
                  setTimeout(() => button.onPress(), 200);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: getButtonTextColor(button.style) },
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Dialog Manager for imperative API
interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  message?: string;
  buttons?: DialogButton[];
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

type DialogListener = (state: DialogState) => void;

class DialogManager {
  private listeners: DialogListener[] = [];

  subscribe(listener: DialogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(state: DialogState) {
    this.listeners.forEach(listener => listener(state));
  }

  show(options: Omit<DialogState, 'visible'>) {
    this.emit({ ...options, visible: true });
  }

  confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    this.show({
      type: 'confirm',
      title,
      message,
      buttons: [
        { text: 'Cancel', onPress: onCancel || (() => {}), style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'default' },
      ],
    });
  }

  success(title: string, message?: string, onDismiss?: () => void) {
    this.show({
      type: 'success',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onDismiss || (() => {}), style: 'default' }],
    });
  }

  error(title: string, message?: string, onDismiss?: () => void) {
    this.show({
      type: 'error',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onDismiss || (() => {}), style: 'default' }],
    });
  }

  warning(title: string, message?: string, buttons?: DialogButton[]) {
    this.show({
      type: 'warning',
      title,
      message,
      buttons,
    });
  }

  hide() {
    this.emit({
      visible: false,
      type: 'info',
      title: '',
    });
  }
}

export const dialog = new DialogManager();

// Dialog Provider Component
export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<DialogState>({
    visible: false,
    type: 'info',
    title: '',
  });

  useEffect(() => {
    const unsubscribe = dialog.subscribe(setState);
    return unsubscribe;
  }, []);

  return (
    <>
      {children}
      <ConfirmDialog
        visible={state.visible}
        type={state.type}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        icon={state.icon}
        onClose={() => setState(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ConfirmDialog;
