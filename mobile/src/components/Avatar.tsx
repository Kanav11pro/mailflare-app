import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface AvatarProps {
  name?: string | null;
  email: string;
  size?: number;
}

const LUXURY_PALETTES = [
  { bg: "#1e3a8a", border: "#3b82f6", text: "#93c5fd" }, // Blue
  { bg: "#4c1d95", border: "#8b5cf6", text: "#c4b5fd" }, // Violet
  { bg: "#831843", border: "#ec4899", text: "#fbcfe8" }, // Pink
  { bg: "#064e3b", border: "#10b981", text: "#a7f3d0" }, // Emerald
  { bg: "#164e63", border: "#06b6d4", text: "#a5f3fc" }, // Cyan
  { bg: "#701a75", border: "#d946ef", text: "#f5d0fe" }, // Fuchsia
  { bg: "#312e81", border: "#6366f1", text: "#c7d2fe" }, // Indigo
  { bg: "#7c2d12", border: "#f97316", text: "#fed7aa" }, // Amber-Orange
];

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const Avatar: React.FC<AvatarProps> = ({ name, email, size = 40 }) => {
  const displayString = name?.trim() || email?.trim() || "?";
  const initials =
    displayString
      .split(/[\s@._]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const paletteIndex = getHash(email.toLowerCase()) % LUXURY_PALETTES.length;
  const palette = LUXURY_PALETTES[paletteIndex];

  return (
    <View
      style={[
        styles.avatarBase,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          {
            color: palette.text,
            fontSize: Math.round(size * 0.38),
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarBase: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
