import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, StatusBar, Animated, Easing, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useKassaSession } from '@/components/kassa-demo/api';

const SPLASH_DURATION_MS = 5000;

/** KASSA branded splash: exactly five seconds before moving to sign-in. */
export default function KassaSplash() {
  const router = useRouter();
  const { scope } = useKassaSession();
  const { width, height } = useWindowDimensions();
  const circleProgress = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef([
    new Animated.Value(0), new Animated.Value(0), new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const circles = Animated.loop(Animated.sequence([
      Animated.timing(circleProgress, {
        toValue: 1, duration: 1800, easing: Easing.out(Easing.bounce),
        useNativeDriver: true,
      }),
      Animated.timing(circleProgress, {
        toValue: 0, duration: 1800, easing: Easing.out(Easing.bounce),
        useNativeDriver: true,
      }),
    ]));
    const reveal = Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1, duration: 430, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(450),
        ...taglineOpacity.map(opacity => Animated.timing(opacity, {
          toValue: 1, duration: 430, useNativeDriver: true,
        })),
      ]),
    ]);
    circles.start();
    reveal.start();
    const fadeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 350, useNativeDriver: true,
      }).start();
    }, SPLASH_DURATION_MS - 350);
    const navigationTimer = setTimeout(() => {
      router.replace(scope ? '/cashier' : '/login');
    }, SPLASH_DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navigationTimer);
      circles.stop();
      reveal.stop();
      screenOpacity.stopAnimation();
    };
  }, [circleProgress, brandOpacity, screenOpacity, taglineOpacity, router, scope]);

  const firstX = circleProgress.interpolate({
    inputRange: [0, 1], outputRange: [0, 100 - width],
  });
  const firstY = circleProgress.interpolate({
    inputRange: [0, 1], outputRange: [0, height - 80],
  });
  const secondX = circleProgress.interpolate({
    inputRange: [0, 1], outputRange: [0, 120 - width],
  });
  const secondY = circleProgress.interpolate({
    inputRange: [0, 1], outputRange: [0, 100 - height],
  });

  return <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
    <StatusBar hidden/>
    <Animated.View pointerEvents="none" style={[styles.circle, styles.circleTop, {
      transform: [{ translateX: firstX }, { translateY: firstY }],
    }]}/>
    <Animated.View pointerEvents="none" style={[styles.circle, styles.circleBottom, {
      transform: [{ translateX: secondX }, { translateY: secondY }],
    }]}/>
    <View style={styles.brand}>
      <Animated.View style={[styles.logoGroup, { opacity: brandOpacity }]}>
        <View style={styles.logoWrapper}>
          <Image source={require('../../assets/images/logo.png')}
            style={styles.logo} resizeMode="contain"/>
        </View>
        <Text style={styles.brandName}>Kassa</Text>
      </Animated.View>
      <View style={styles.taglineRow}>
        {['Simple.', 'Smart.', 'In control.'].map((word, index) =>
          <Animated.Text key={word}
            style={[styles.tagline, { opacity: taglineOpacity[index] }]}>
            {word}
          </Animated.Text>
        )}
      </View>
    </View>
    <Text style={styles.footer}>Powered for modern businesses</Text>
  </Animated.View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0D705B', overflow: 'hidden' },
  brand: { zIndex: 1, alignItems: 'center' },
  logoGroup: { alignItems: 'center' },
  logoWrapper: { backgroundColor: '#FFFFFF', width: 84, paddingHorizontal: 2,
    paddingVertical: 10, borderRadius: 8 },
  logo: { width: 80, height: 40 },
  brandName: { color: '#FFFFFF', fontSize: 35, fontWeight: 'bold', marginTop: 18 },
  taglineRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap',
    gap: 5, marginTop: 8 },
  tagline: { fontSize: 20, color: '#FFFFFF' },
  circle: { position: 'absolute', borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)' },
  circleTop: { width: 200, height: 200, top: -80, right: -70 },
  circleBottom: { width: 210, height: 210, bottom: -110, right: -100 },
  footer: { position: 'absolute', bottom: 35, color: '#FFFFFF', fontSize: 14, zIndex: 1 },
});
