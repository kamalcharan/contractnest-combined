// src/components/ui/index.tsx
// ContractNest mobile UI kit — every piece reads from the active theme.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { tint } from '../../utils/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/* ------------------------------- Button ------------------------------- */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const blocked = disabled || loading;

  const background =
    variant === 'primary' ? c.brand.primary : variant === 'danger' ? c.semantic.error : 'transparent';
  const borderColor =
    variant === 'secondary' ? c.brand.primary : variant === 'ghost' ? 'transparent' : 'transparent';
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'secondary'
        ? c.brand.primary
        : c.utility.secondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        {
          backgroundColor: background,
          borderColor,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: blocked ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={size === 'sm' ? 16 : 19} color={textColor} /> : null}
          <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, { color: textColor }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

/* ------------------------------ TextField ------------------------------ */

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...inputProps
}) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const [focused, setFocused] = useState(false);
  const borderColor = error ? c.semantic.error : focused ? c.brand.primary : tint(c.utility.secondaryText, '40');

  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.fieldLabel, { color: c.utility.secondaryText }]}>{label}</Text> : null}
      <View
        style={[
          styles.fieldWrap,
          { borderColor, backgroundColor: c.utility.secondaryBackground },
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon} size={19} color={focused ? c.brand.primary : c.utility.secondaryText} />
        ) : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={tint(c.utility.secondaryText, '99')}
          style={[styles.fieldInput, { color: c.utility.primaryText }, inputProps.style]}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10}>
            <MaterialCommunityIcons name={rightIcon} size={20} color={c.utility.secondaryText} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.fieldError, { color: c.semantic.error }]}>{error}</Text> : null}
    </View>
  );
};

/* -------------------------------- Card -------------------------------- */

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }> = ({
  children,
  style,
  onPress,
}) => {
  const { theme, isDarkMode } = useTheme();
  const c = theme.colors;
  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.utility.secondaryBackground,
          borderColor: isDarkMode ? tint('#ffffff', '14') : tint('#000000', '10'),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
      {body}
    </Pressable>
  );
};

/* -------------------------------- Badge -------------------------------- */

export const Badge: React.FC<{ label: string; color: string; small?: boolean }> = ({ label, color, small }) => (
  <View
    style={[
      styles.badge,
      small && styles.badgeSm,
      { backgroundColor: tint(color, '22'), borderColor: tint(color, '44') },
    ]}
  >
    <Text style={[styles.badgeText, small && styles.badgeTextSm, { color }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

/* ------------------------------- Chip ---------------------------------- */

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  count?: number;
}

export const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress, icon, count }) => {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c.brand.primary : c.utility.secondaryBackground,
          borderColor: selected ? c.brand.primary : tint(c.utility.secondaryText, '44'),
        },
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={15} color={selected ? '#fff' : c.utility.secondaryText} />
      ) : null}
      <Text style={[styles.chipText, { color: selected ? '#fff' : c.utility.primaryText }]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.chipCount, { backgroundColor: selected ? tint('#ffffff', '33') : tint(c.brand.primary, '22') }]}>
          <Text style={[styles.chipCountText, { color: selected ? '#fff' : c.brand.primary }]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

/* ------------------------------- Avatar -------------------------------- */

export const Avatar: React.FC<{ label: string; color: string; size?: number }> = ({ label, color, size = 44 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: tint(color, '2b'),
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text style={{ color, fontWeight: '800', fontSize: size * 0.38 }}>{label}</Text>
  </View>
);

/* ----------------------------- EmptyState ------------------------------ */

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: tint(c.brand.primary, '1a') }]}>
        <MaterialCommunityIcons name={icon} size={34} color={c.brand.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.utility.primaryText }]}>{title}</Text>
      {message ? <Text style={[styles.emptyMessage, { color: c.utility.secondaryText }]}>{message}</Text> : null}
      {action ? <Button title={action.title} onPress={action.onPress} style={{ marginTop: 16 }} /> : null}
    </View>
  );
};

/* ------------------------------ Skeleton ------------------------------- */

export const Skeleton: React.FC<{ width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}) => {
  const { isDarkMode } = useTheme();
  const opacity = React.useRef(new Animated.Value(0.45)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: isDarkMode ? '#ffffff22' : '#00000014', opacity },
        style,
      ]}
    />
  );
};

/* ------------------------------ KpiCard -------------------------------- */

interface KpiCardProps {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, color, sub, icon, style }) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const valueColor = color ?? c.utility.primaryText;
  return (
    <Card style={[styles.kpi, style]}>
      <View style={styles.kpiHead}>
        <Text style={[styles.kpiLabel, { color: c.utility.secondaryText }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        {icon ? <MaterialCommunityIcons name={icon} size={16} color={color ?? c.utility.secondaryText} /> : null}
      </View>
      <Text style={[styles.kpiValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.kpiSub, { color: c.utility.secondaryText }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Card>
  );
};

/* --------------------------- SegmentedControl --------------------------- */

interface SegmentedControlProps {
  options: Array<{ id: string; label: string; icon?: IconName }>;
  value: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, style }) => {
  const { theme, isDarkMode } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={[
        styles.segment,
        { backgroundColor: isDarkMode ? tint('#ffffff', '12') : tint('#000000', '0d') },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.segmentItem,
              active && { backgroundColor: c.utility.secondaryBackground, shadowOpacity: 0.12, elevation: 2 },
            ]}
          >
            {option.icon ? (
              <MaterialCommunityIcons
                name={option.icon}
                size={15}
                color={active ? c.brand.primary : c.utility.secondaryText}
              />
            ) : null}
            <Text
              style={[
                styles.segmentText,
                { color: active ? c.utility.primaryText : c.utility.secondaryText, fontWeight: active ? '700' : '500' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ----------------------------- SectionTitle ----------------------------- */

export const SectionTitle: React.FC<{ title: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  title,
  right,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionTitleRow, style]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.utility.primaryText }]}>{title}</Text>
      {right}
    </View>
  );
};

/* ----------------------------- PreviewBadge ----------------------------- */

export const PreviewBadge: React.FC = () => {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.preview, { backgroundColor: tint(c.brand.tertiary, '22'), borderColor: tint(c.brand.tertiary, '44') }]}>
      <MaterialCommunityIcons name="eye-outline" size={12} color={c.brand.tertiary} />
      <Text style={[styles.previewText, { color: c.brand.tertiary }]}>PREVIEW</Text>
    </View>
  );
};

/* -------------------------------- styles ------------------------------- */

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  buttonSm: { height: 38, borderRadius: 10, paddingHorizontal: 14 },
  buttonText: { fontSize: 15.5, fontWeight: '700' },
  buttonTextSm: { fontSize: 13.5 },

  fieldLabel: { fontSize: 12.5, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  fieldInput: { flex: 1, fontSize: 15.5, paddingVertical: 12 },
  fieldError: { fontSize: 12, marginTop: 5, fontWeight: '500' },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  badgeTextSm: { fontSize: 10.5 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    height: 34,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipCount: { borderRadius: 999, minWidth: 20, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  chipCountText: { fontSize: 10.5, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16.5, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  kpi: { padding: 14, minWidth: 130 },
  kpiHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kpiLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, flex: 1 },
  kpiValue: { fontSize: 21, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  kpiSub: { fontSize: 11.5, marginTop: 3 },

  segment: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 9,
    shadowColor: '#000',
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentText: { fontSize: 13 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  previewText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
});
