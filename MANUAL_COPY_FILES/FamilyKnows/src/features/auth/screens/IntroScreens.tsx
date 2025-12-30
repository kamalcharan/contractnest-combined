// src/features/auth/screens/IntroScreens.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { Text } from '@rneui/themed';
import { useTheme } from '../../../theme/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IntroScreensNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Intro'>;

interface Props {
  navigation: IntroScreensNavigationProp;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INTRO_SHOWN_KEY = '@FamilyKnows:introShown';

// Animated Feature Card
const FeatureCard = ({ icon, text, delay, color }: { icon: string; text: string; delay: number; color: string }) => {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const { theme } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          backgroundColor: theme.colors.utility.secondaryBackground,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.featureText, { color: theme.colors.utility.primaryText }]}>
        {text}
      </Text>
    </Animated.View>
  );
};

// Animated Category Bubble
const CategoryBubble = ({ icon, label, color, delay, angle, radius }: any) => {
  const scale = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const x = radius * Math.cos(angle * Math.PI / 180);
  const y = radius * Math.sin(angle * Math.PI / 180);

  return (
    <Animated.View
      style={[
        styles.categoryBubble,
        {
          backgroundColor: theme.colors.utility.secondaryBackground,
          transform: [
            { translateX: x },
            { translateY: y },
            { scale },
          ],
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.categoryLabel, { color: theme.colors.utility.primaryText }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

export const IntroScreens: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Page entrance animations
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSkip = async () => {
    await AsyncStorage.setItem(INTRO_SHOWN_KEY, 'true');
    navigation.replace('Login');
  };

  const handleNext = () => {
    if (currentPage < 2) {
      scrollViewRef.current?.scrollTo({
        x: SCREEN_WIDTH * (currentPage + 1),
        animated: true,
      });
    } else {
      handleSkip();
    }
  };

  const screens = [
    {
      id: 1,
      title: "Your Family's Digital Vault",
      subtitle: "Why FamilyKnows?",
      iconName: "shield-home",
      features: [
        { icon: "checkmark-circle", text: "One trusted place for everything" },
        { icon: "sparkles", text: "AI-powered insights" },
        { icon: "people", text: "Connect with verified providers" },
        { icon: "heart", text: "Share across generations" },
      ],
    },
    {
      id: 2,
      title: "Your Privacy, Our Priority",
      subtitle: "Bank-Grade Security",
      iconName: "lock-check",
      features: [
        { icon: "lock-closed", text: "End-to-end encryption" },
        { icon: "shield-checkmark", text: "Your data stays yours" },
        { icon: "cloud-offline", text: "Offline-first architecture" },
        { icon: "key", text: "PIN protected access" },
      ],
    },
    {
      id: 3,
      title: "Everything Your Family Needs",
      subtitle: "Beyond Just Assets",
      categories: [
        { icon: "home", label: "Property", color: '#FF6B6B' },
        { icon: "medical-bag", label: "Medical", color: '#4ECDC4' },
        { icon: "diamond-stone", label: "Valuables", color: '#45B7D1' },
        { icon: "cellphone", label: "Electronics", color: '#96CEB4' },
        { icon: "car", label: "Vehicles", color: '#FECA57' },
        { icon: "file-document", label: "Documents", color: '#9C88FF' },
      ],
    },
  ];

  const renderPagination = () => (
    <View style={styles.pagination}>
      {screens.map((_, index) => {
        const inputRange = [
          (index - 1) * SCREEN_WIDTH,
          index * SCREEN_WIDTH,
          (index + 1) * SCREEN_WIDTH,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 28, 8],
          extrapolate: 'clamp',
        });

        const dotOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor: theme.colors.brand.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const renderScreen1or2 = (screen: any, index: number) => (
    <View key={screen.id} style={styles.screen}>
      <Animated.View
        style={[
          styles.screenContent,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Icon Container */}
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.brand.primary + '15' }]}>
          <MaterialCommunityIcons
            name={screen.iconName}
            size={80}
            color={theme.colors.brand.primary}
          />
        </View>

        {/* Text Content */}
        <Text style={[styles.subtitle, { color: theme.colors.brand.primary }]}>
          {screen.subtitle}
        </Text>
        <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
          {screen.title}
        </Text>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {screen.features?.map((feature: any, idx: number) => (
            <FeatureCard
              key={idx}
              icon={feature.icon}
              text={feature.text}
              delay={idx * 100}
              color={theme.colors.brand.primary}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );

  const renderScreen3 = (screen: any) => (
    <View key={screen.id} style={styles.screen}>
      <Animated.View
        style={[
          styles.screenContent,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Text Content */}
        <Text style={[styles.subtitle, { color: theme.colors.brand.primary }]}>
          {screen.subtitle}
        </Text>
        <Text style={[styles.title, { color: theme.colors.utility.primaryText }]}>
          {screen.title}
        </Text>

        {/* Wheel Layout */}
        <View style={styles.wheelContainer}>
          <View style={styles.wheelContent}>
            {/* Central Hub */}
            <View style={[styles.centralHub, { backgroundColor: theme.colors.brand.primary }]}>
              <FontAwesome5 name="infinity" size={28} color="#FFF" />
              <Text style={styles.hubText}>& More</Text>
            </View>

            {/* Category Bubbles */}
            {screen.categories?.map((cat: any, idx: number) => (
              <CategoryBubble
                key={idx}
                icon={cat.icon}
                label={cat.label}
                color={cat.color}
                delay={idx * 80}
                angle={(idx * 60) - 90}
                radius={95}
              />
            ))}
          </View>
        </View>

        {/* Bottom Text */}
        <Text style={[styles.bottomText, { color: theme.colors.utility.secondaryText }]}>
          Store anything that matters to your family
        </Text>
      </Animated.View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.utility.primaryBackground }]}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: theme.colors.utility.secondaryText }]}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Screens */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(page);
        }}
        scrollEventThrottle={16}
      >
        {screens.map((screen, index) =>
          index < 2 ? renderScreen1or2(screen, index) : renderScreen3(screen)
        )}
      </ScrollView>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.utility.primaryBackground }]}>
        {renderPagination()}

        {/* Next/Get Started Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: theme.colors.brand.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentPage === 2 ? "Get Started" : "Next"}
          </Text>
          <MaterialCommunityIcons
            name={currentPage === 2 ? "check" : "arrow-right"}
            size={22}
            color="#FFF"
            style={styles.nextButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 55,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  screenContent: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  wheelContainer: {
    width: SCREEN_WIDTH - 48,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  wheelContent: {
    width: 250,
    height: 250,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralHub: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 10,
  },
  hubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 2,
  },
  categoryBubble: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
  bottomText: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
});
