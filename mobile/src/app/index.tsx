
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Easing,
} from "react-native";

export default function SplashScreen() {
  // Only the tagline and background circles are animated
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const circleTopMove = useRef(new Animated.Value(0)).current;
  const circleBottomMove = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Tagline fade-in animation
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Top circle floating animation
    const topAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(circleTopMove, {
          toValue: 20,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(circleTopMove, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Bottom circle floating animation
    const bottomAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(circleBottomMove, {
          toValue: -25,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(circleBottomMove, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    topAnimation.start();
    bottomAnimation.start();

    return () => {
      topAnimation.stop();
      bottomAnimation.stop();
    };
  }, [taglineOpacity, circleTopMove, circleBottomMove]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Decorative floating circles */}
      <Animated.View
        style={[
          styles.circle,
          styles.circleTop,
          {
            transform: [{ translateY: circleTopMove }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.circle,
          styles.circleBottom,
          {
            transform: [{ translateY: circleBottomMove }],
          },
        ]}
      />

      {/* KASSA branding */}
      <View style={styles.brand}>
        {/* Static Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Static Brand Name */}
        <Text style={styles.brandName}>Kassa</Text>

        {/* Animated Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
            },
          ]}
        >
          Simple. Smart. In control.
        </Animated.Text>
      </View>

      {/* Static Footer */}
      <Text style={styles.footer}>
        Powered for modern businesses
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D705B",
    overflow: "hidden",
  },

  brand: {
    alignItems: "center",
  },

  logoWrapper: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
  },

  logo: {
    width: 80,
    height: 40,
  },

  brandName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 18,
  },

  tagline: {
    fontSize: 15,
    color: "#FFFFFF",
    marginTop: 8,
  },

  circle: {
    position: "absolute",
    borderRadius: 200,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },

  circleTop: {
    width: 240,
    height: 240,
    top: -80,
    right: -70,
  },

  circleBottom: {
    width: 300,
    height: 300,
    bottom: -110,
    left: -100,
  },

  footer: {
    color: "#FFFFFF",
    fontSize: 12,
    position: "absolute",
    bottom: 35,
  },
});
