// src/features/auth/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tint } from '../../utils/format';

export const SplashScreen: React.FC = () => {
  const { theme } = useTheme();
  const c = theme.colors;
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: c.utility.primaryBackground }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }], opacity }}>
        <View style={[styles.logo, { backgroundColor: c.brand.primary }]}>
          <Text style={styles.logoText}>CN</Text>
        </View>
        <Text style={[styles.name, { color: c.utility.primaryText }]}>ContractNest</Text>
        <Text style={[styles.tagline, { color: c.utility.secondaryText }]}>
          Contracts · Cadence · Cashflow
        </Text>
      </Animated.View>
      <View style={[styles.footerDot, { backgroundColor: tint(c.brand.primary, '33') }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  tagline: { fontSize: 13, marginTop: 6, letterSpacing: 0.4, fontWeight: '500' },
  footerDot: { position: 'absolute', bottom: 48, width: 44, height: 5, borderRadius: 3 },
});
