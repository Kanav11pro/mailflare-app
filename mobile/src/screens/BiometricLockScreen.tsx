import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, Lock, Fingerprint, ScanFace } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useBiometric } from "../context/biometric-context";

export const BiometricLockScreen: React.FC = () => {
  const { biometricType, authenticate } = useBiometric();

  useEffect(() => {
    // Prompt biometric dialog immediately on lock screen mount
    const timer = setTimeout(() => {
      authenticate();
    }, 400);
    return () => clearTimeout(timer);
  }, [authenticate]);

  const handleUnlockPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    authenticate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerCard}>
        {/* Glowing Shield Icon */}
        <View style={styles.iconCircle}>
          <ShieldCheck size={44} color="#3b82f6" strokeWidth={2.2} />
        </View>

        <Text style={styles.title}>Mailflare Protected</Text>
        <Text style={styles.subtitle}>
          Your emails are encrypted and secured. Unlock using {biometricType}.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleUnlockPress}
          style={styles.unlockBtn}
        >
          {biometricType === "Face ID" ? (
            <ScanFace size={20} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <Fingerprint size={20} color="#ffffff" strokeWidth={2.5} />
          )}
          <Text style={styles.unlockBtnText}>Unlock with {biometricType}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Lock size={13} color="#475569" />
        <Text style={styles.footerText}>Hardware Enclave Secured</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c10",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centerCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#13141d",
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 36,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  unlockBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
});
