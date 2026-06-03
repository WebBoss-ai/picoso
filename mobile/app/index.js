import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';

export default function Index() {
  const router = useRouter();
  const { loading, isAuthenticated, isOnboarded } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (!isOnboarded) {
        router.replace('/onboarding');
      } else if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, isOnboarded]);

  return (
    <LinearGradient
      colors={Colors.gradientHero}
      style={styles.container}
    >
      <ActivityIndicator color={Colors.primary} size="large" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
