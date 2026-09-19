import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useAppTheme } from "../context/theme-context";

export const SkeletonRow: React.FC = () => {
  const { theme, isDark } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const blockBg = isDark ? theme.border : "#e2e8f0";
  const blockSubtleBg = isDark ? theme.cardSubtle : "#f1f5f9";

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "flex-start",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: blockBg,
          marginRight: 12,
        }}
      />
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              width: "40%",
              height: 14,
              borderRadius: 4,
              backgroundColor: blockBg,
            }}
          />
          <View
            style={{
              width: "15%",
              height: 10,
              borderRadius: 4,
              backgroundColor: blockSubtleBg,
            }}
          />
        </View>
        <View
          style={{
            width: "70%",
            height: 12,
            borderRadius: 4,
            backgroundColor: blockBg,
            marginBottom: 6,
          }}
        />
        <View
          style={{
            width: "90%",
            height: 10,
            borderRadius: 4,
            backgroundColor: blockSubtleBg,
          }}
        />
      </View>
    </Animated.View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
};

