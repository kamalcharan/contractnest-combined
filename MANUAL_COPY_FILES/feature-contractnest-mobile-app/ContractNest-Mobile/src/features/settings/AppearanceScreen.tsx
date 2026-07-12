// src/features/settings/AppearanceScreen.tsx
// Theme gallery (same theme set as the web app) + dark mode switch.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../components/ui';
import { tint } from '../../utils/format';
import { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Appearance'>;

export const AppearanceScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDarkMode, toggleDarkMode, currentThemeId, setTheme, availableThemes } = useTheme();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.navButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.utility.primaryText} />
        </Pressable>
        <Text style={[styles.navTitle, { color: c.utility.primaryText }]}>Appearance</Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 28 }}>
        <Card style={styles.darkRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <MaterialCommunityIcons
              name={isDarkMode ? 'weather-night' : 'weather-sunny'}
              size={22}
              color={c.brand.primary}
            />
            <View>
              <Text style={[styles.darkTitle, { color: c.utility.primaryText }]}>Dark mode</Text>
              <Text style={[styles.darkSub, { color: c.utility.secondaryText }]}>
                {isDarkMode ? 'On' : 'Off'} — every theme has a dark variant
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ true: c.brand.primary, false: undefined }}
            thumbColor="#ffffff"
          />
        </Card>

        <Text style={[styles.sectionLabel, { color: c.utility.secondaryText }]}>
          THEMES — SAME SET AS THE WEB APP
        </Text>
        <View style={styles.grid}>
          {availableThemes.map((option) => {
            const palette = isDarkMode && option.darkMode ? option.darkMode.colors : option.colors;
            const active = option.id === currentThemeId;
            return (
              <Pressable
                key={option.id}
                onPress={() => setTheme(option.id)}
                style={[
                  styles.swatchCard,
                  {
                    backgroundColor: palette.utility.secondaryBackground,
                    borderColor: active ? c.brand.primary : tint(c.utility.secondaryText, '33'),
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.swatchRow}>
                  <View style={[styles.swatch, { backgroundColor: palette.brand.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.brand.secondary }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.brand.tertiary }]} />
                  <View style={[styles.swatch, { backgroundColor: palette.semantic.success }]} />
                </View>
                <View style={[styles.swatchPreview, { backgroundColor: palette.utility.primaryBackground }]}>
                  <View style={[styles.swatchLine, { backgroundColor: palette.utility.primaryText, width: '62%' }]} />
                  <View style={[styles.swatchLine, { backgroundColor: palette.utility.secondaryText, width: '40%' }]} />
                  <View style={[styles.swatchButton, { backgroundColor: palette.brand.primary }]} />
                </View>
                <View style={styles.swatchFooter}>
                  <Text style={[styles.swatchName, { color: palette.utility.primaryText }]} numberOfLines={1}>
                    {option.name}
                  </Text>
                  {active ? (
                    <MaterialCommunityIcons name="check-circle" size={17} color={c.brand.primary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '700' },
  darkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  darkTitle: { fontSize: 15, fontWeight: '700' },
  darkSub: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, padding: 12 },
  swatchRow: { flexDirection: 'row', gap: 6 },
  swatch: { width: 18, height: 18, borderRadius: 6 },
  swatchPreview: { borderRadius: 10, padding: 10, marginTop: 10, gap: 6 },
  swatchLine: { height: 6, borderRadius: 3, opacity: 0.85 },
  swatchButton: { height: 12, width: 46, borderRadius: 6, marginTop: 2 },
  swatchFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  swatchName: { fontSize: 12.5, fontWeight: '700', flex: 1 },
});
