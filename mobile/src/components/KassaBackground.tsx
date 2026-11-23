
import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

type KassaBackgroundProps = {
  children: ReactNode;
};

export default function KassaBackground({
  children,
}: KassaBackgroundProps) {
  const { width } = useWindowDimensions();

  // Responsive circle sizes
  const topSize = Math.min(width * 0.73, 400);
  const bottomSize = Math.min(width * 0.85, 460);

  return (
    <View style={styles.container}>
      {/* Top-right circle */}
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            width: topSize,
            height: topSize,
            top: -topSize * 0.43,
            right: -topSize * 0.57,
          },
        ]}
      />

      {/* Bottom-left circle */}
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            width: bottomSize,
            height: bottomSize,
            bottom: -bottomSize * 0.57,
            left: -bottomSize * 0.51,
          },
        ]}
      />

      {/* Screen content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#E8F3EF",
  },

  content: {
    flex: 1,
    zIndex: 1,
  },
});
