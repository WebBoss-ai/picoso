import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const Layout = {
  screenWidth: SCREEN_WIDTH,
  horizontalPadding: 20,
  cardPadding: 16,
  sectionGap: 28,
  tabBarHeight: 64,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20 },
    android: { elevation: 6 },
  }),
  xl: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 30 },
    android: { elevation: 10 },
  }),
  card: Platform.select({
    ios: { shadowColor: '#14532d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
    android: { elevation: 3 },
  }),
  green: Platform.select({
    ios: { shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 14 },
    android: { elevation: 6 },
  }),
  tab: Platform.select({
    ios: { shadowColor: '#14532d', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 16 },
    android: { elevation: 16 },
  }),
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, lineHeight: 24 },
  h4: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  bodySemibold: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
};

export default { Layout, FontSizes, Spacing, Radius, Shadow, Typography };
