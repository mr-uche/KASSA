
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();

  // Controls the movement of both circles
  const circleProgress = useRef(
    new Animated.Value(0)
  ).current;

  // Each tagline phrase has its own opacity
  const wordOpacities = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // CIRCLES: Move diagonally and bounce back
    const circleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(circleProgress, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.bounce),
          useNativeDriver: true,
        }),

        Animated.timing(circleProgress, {
          toValue: 0,
          duration: 1600,
          easing: Easing.out(Easing.bounce),
          useNativeDriver: true,
        }),
      ])
    );

    // TAGLINE: Fade in one phrase at a time
    const taglineAnimation = Animated.loop(
      Animated.sequence([
        // Simple.
        Animated.timing(wordOpacities[0], {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),

        // Smart.
        Animated.timing(wordOpacities[1], {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),

        // In control.
        Animated.timing(wordOpacities[2], {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),

        // Keep all words visible
        Animated.delay(1000),

        // Fade out all words together
        Animated.parallel(
          wordOpacities.map((opacity) =>
            Animated.timing(opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            })
          )
        ),

        Animated.delay(300),
      ])
    );

    circleAnimation.start();
    taglineAnimation.start();

    return () => {
      circleAnimation.stop();
      taglineAnimation.stop();
    };
  }, [circleProgress, wordOpacities]);

  // Circle 1: Top-right to bottom-left
  const circleOneX = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100 - width],
  });

  const circleOneY = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height - 80],
  });

  // Circle 2: Bottom-right to top-left
  const circleTwoX = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120 - width],
  });

  const circleTwoY = circleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100 - height],
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Animated background circle 1 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          styles.circleTop,
          {
            transform: [
              { translateX: circleOneX },
              { translateY: circleOneY },
            ],
          },
        ]}
      />

      {/* Animated background circle 2 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          styles.circleBottom,
          {
            transform: [
              { translateX: circleTwoX },
              { translateY: circleTwoY },
            ],
          },
        ]}
      />

      {/* STATIC KASSA LOGO AND BRAND */}
      <View style={styles.brand}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandName}>
          Kassa
        </Text>

        {/* Animated tagline only */}
        <View style={styles.taglineRow}>
          {[
            "Simple.",
            "Smart.",
            "In control.",
          ].map((word, index) => (
            <Animated.Text
              key={word}
              style={[
                styles.tagline,
                {
                  opacity: wordOpacities[index],
                },
              ]}
            >
              {word}
            </Animated.Text>
          ))}
        </View>
      </View>

      {/* Static footer */}
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
    zIndex: 1,
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

  taglineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
  },

  tagline: {
    fontSize: 15,
    color: "#FFFFFF",
  },

  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  circleTop: {
    width: 200,
    height: 200,
    top: -80,
    right: -70,
  },

  circleBottom: {
    width: 210,
    height: 210,
    bottom: -110,
    right: -100,
  },

  footer: {
    color: "#FFFFFF",
    fontSize: 12,
    position: "absolute",
    bottom: 35,
    zIndex: 1,
  },
});
