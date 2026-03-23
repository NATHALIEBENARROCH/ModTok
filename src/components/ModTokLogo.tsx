import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";

interface ModTokLogoProps {
  size?: "small" | "medium" | "large";
  showTagline?: boolean;
}

export default function ModTokLogo({
  size = "medium",
  showTagline = false,
}: ModTokLogoProps) {
  const logoWidth = size === "small" ? 140 : size === "medium" ? 200 : 280;
  const logoHeight = logoWidth * 0.55;
  const taglineSize = size === "small" ? 11 : size === "medium" ? 13 : 16;

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: taglineSize }]}>
          Sort · Style · Save · Share · Sell
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  tagline: {
    color: "#888888",
    fontWeight: "500",
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
