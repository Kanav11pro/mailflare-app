import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Flame, Lock, Mail, Server, ChevronDown, ChevronUp, AlertCircle, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/auth-context";
import { useAppTheme } from "../context/theme-context";

export const LoginScreen: React.FC = () => {
  const { theme, isDark } = useAppTheme();
  const { login, verifyMfa, serverUrl } = useAuth();
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [customServerUrl, setCustomServerUrl] = useState(serverUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (serverUrl) {
      setCustomServerUrl(serverUrl);
    }
  }, [serverUrl]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const effectiveServer = (customServerUrl || serverUrl || "http://192.168.1.36:3002").trim();

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await login(email.trim(), password, effectiveServer);
      if (res?.mfaRequired && res.challengeToken) {
        setMfaChallenge(res.challengeToken);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode.trim() || !mfaChallenge) {
      setError("Please enter your 6-digit verification code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await verifyMfa(mfaChallenge, mfaCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Invalid 2FA code. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Logo & Header */}
          <View style={styles.logoSection}>
            <View style={[styles.logoBadge, { backgroundColor: isDark ? "#161c2e" : "#eff6ff", borderColor: isDark ? "#233054" : "#bfdbfe" }]}>
              <Flame size={36} color={theme.primary} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Mailflare</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {mfaChallenge ? "Two-Factor Verification" : "Serverless Email on Cloudflare"}
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#f87171" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {mfaChallenge ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>6-DIGIT TOTP / RECOVERY CODE</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.cardSubtle,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      value={mfaCode}
                      onChangeText={setMfaCode}
                      placeholder="123456"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="number-pad"
                      autoFocus
                      style={[styles.input, { color: theme.textPrimary }]}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleVerifyMfa}
                  disabled={loading}
                  style={[styles.signInButton, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.signInButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setMfaChallenge(null);
                    setMfaCode("");
                  }}
                  style={{ alignItems: "center", marginTop: 16 }}
                >
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600" }}>
                    ← Back to password login
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>EMAIL ADDRESS</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.cardSubtle,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Mail size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="support@mail.studyholic.xyz"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[styles.input, { color: theme.textPrimary }]}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textMuted }]}>PASSWORD</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.cardSubtle,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••••••"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      style={[styles.input, { color: theme.textPrimary }]}
                    />
                  </View>
                </View>

                {/* Server Settings Accordion */}
                <TouchableOpacity
                  onPress={() => setShowServerConfig(!showServerConfig)}
                  style={styles.serverToggle}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Server size={14} color={theme.textMuted} />
                    <Text style={[styles.serverToggleText, { color: theme.textMuted }]}>Server Settings</Text>
                  </View>
                  {showServerConfig ? (
                    <ChevronUp size={14} color={theme.textMuted} />
                  ) : (
                    <ChevronDown size={14} color={theme.textMuted} />
                  )}
                </TouchableOpacity>

                {showServerConfig && (
                  <View style={[styles.inputGroup, { marginTop: 10 }]}>
                    <Text style={[styles.inputLabel, { color: theme.textMuted }]}>MAILFLARE ENDPOINT</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: theme.cardSubtle,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TextInput
                        value={customServerUrl}
                        onChangeText={setCustomServerUrl}
                        placeholder="http://192.168.1.36:3002"
                        placeholderTextColor={theme.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.textPrimary }]}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setCustomServerUrl("http://192.168.1.36:3002");
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.presetChip}
                      >
                        <Text style={styles.presetChipText}>Local Dev (:3002)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setCustomServerUrl("https://mailflare-app.cbforin.workers.dev");
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.presetChip}
                      >
                        <Text style={styles.presetChipText}>Production (Cloudflare)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Sign In Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleLogin}
                  disabled={loading}
                  style={[styles.signInButton, loading && { opacity: 0.7 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.signInButtonText}>Sign In to Mailflare</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0c10",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: "#13141d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222534",
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "500",
  },
  serverToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  serverToggleText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  presetChip: {
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetChipText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },
  signInButton: {
    backgroundColor: "#2563eb",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
