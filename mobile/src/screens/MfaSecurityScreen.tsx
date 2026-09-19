import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  QrCode,
  CheckCircle2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { api } from "../api/client";
import { MfaStatus, MfaEnrollResult } from "../types";

export const MfaSecurityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Enrollment State
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollStep, setEnrollStep] = useState<1 | 2 | 3>(1);
  const [enrollData, setEnrollData] = useState<MfaEnrollResult | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Disable MFA Modal
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMfaStatus();
      setStatus(data);
    } catch (err: any) {
      console.error("Failed to load MFA status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartEnrollment = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      const data = await api.enrollMfa();
      setEnrollData(data);
      setEnrollStep(1);
      setEnrollModalVisible(true);
    } catch (err: any) {
      Alert.alert("Enrollment Error", err.message || "Failed to initialize 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    if (verifyCode.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setVerifying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.confirmMfa(verifyCode.trim());
      setRecoveryCodes(res.recoveryCodes || []);
      setEnrollStep(3);
      fetchStatus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Invalid 6-digit code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    if (disableCode.trim().length < 6) {
      Alert.alert("Verification Code Required", "Enter current 6-digit authenticator or recovery code.");
      return;
    }

    try {
      setDisabling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.disableMfa(disableCode.trim());
      setDisableModalVisible(false);
      setDisableCode("");
      fetchStatus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("2FA Disabled", "Two-factor authentication has been turned off.");
    } catch (err: any) {
      Alert.alert("Disable Failed", err.message || "Could not verify code.");
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateRecoveryCodes = () => {
    Alert.alert(
      "Regenerate Recovery Codes?",
      "Existing recovery codes will be invalidated. You will receive 8 new single-use backup codes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const res = await api.regenerateRecoveryCodes();
              setRecoveryCodes(res.recoveryCodes);
              setEnrollStep(3);
              setEnrollModalVisible(true);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to generate recovery codes.");
            }
          },
        },
      ]
    );
  };

  const copySecretKey = () => {
    if (!enrollData?.secret) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    Alert.alert("Copied to Clipboard", enrollData.secret);
  };

  const copyAllRecoveryCodes = () => {
    const codesText = recoveryCodes.join("\n");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
    Alert.alert("Recovery Codes Copied", "Save these backup codes in a safe offline location.\n\n" + codesText);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Navbar */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.goBack()}
          style={styles.navBtn}
        >
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Two-Factor Security</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Hero Card */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.card,
                borderColor: status?.enabled ? theme.success : theme.warning,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={[
                  styles.statusIconCircle,
                  { backgroundColor: status?.enabled ? theme.successSubtle : theme.warningSubtle },
                ]}
              >
                {status?.enabled ? (
                  <ShieldCheck size={28} color={theme.success} />
                ) : (
                  <ShieldAlert size={28} color={theme.warning} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>
                  {status?.enabled ? "2FA Protection Active" : "2FA Protection Off"}
                </Text>
                <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
                  {status?.enabled
                    ? "Your account requires an RFC 6238 TOTP authenticator code on login."
                    : "Protect your mailboxes from unauthorized access by setting up 2FA."}
                </Text>
              </View>
            </View>

            {status?.enabled ? (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleRegenerateRecoveryCodes}
                  style={[styles.secondaryBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                >
                  <Key size={16} color={theme.primary} />
                  <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Backup Codes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setDisableModalVisible(true)}
                  style={[styles.dangerBtn, { backgroundColor: theme.dangerSubtle, borderColor: theme.danger }]}
                >
                  <Unlock size={16} color={theme.danger} />
                  <Text style={[styles.dangerBtnText, { color: theme.danger }]}>Disable 2FA</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleStartEnrollment}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              >
                <Lock size={16} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Enable Two-Factor Auth</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Supported Apps Explainer */}
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>Supported Authenticator Apps</Text>
            <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
              Mailflare is compatible with any standard RFC 6238 TOTP authenticator:
            </Text>
            <View style={styles.appList}>
              <Text style={[styles.appItem, { color: theme.textSecondary }]}>• 1Password / Bitwarden</Text>
              <Text style={[styles.appItem, { color: theme.textSecondary }]}>• Google Authenticator</Text>
              <Text style={[styles.appItem, { color: theme.textSecondary }]}>• Apple iCloud Keychain Passwords</Text>
              <Text style={[styles.appItem, { color: theme.textSecondary }]}>• Aegis / Authy / Microsoft Authenticator</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* 3-Step Enrollment Wizard Modal */}
      <Modal visible={enrollModalVisible} animationType="slide" transparent onRequestClose={() => setEnrollModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {enrollStep === 1 && (
              <>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepNumber, { color: theme.primary }]}>STEP 1 OF 3</Text>
                  <Text style={[styles.wizardTitle, { color: theme.textPrimary }]}>Copy Authenticator Key</Text>
                  <Text style={[styles.wizardSubtitle, { color: theme.textSecondary }]}>
                    Open your authenticator app and enter this secret key manually:
                  </Text>
                </View>

                <View style={[styles.keyContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.secretKeyText, { color: theme.primary }]} selectable>
                    {enrollData?.secret || "•••• •••• ••••"}
                  </Text>
                  <TouchableOpacity onPress={copySecretKey} style={[styles.copyBtn, { backgroundColor: theme.primarySubtle }]}>
                    {copiedKey ? <Check size={16} color={theme.success} /> : <Copy size={16} color={theme.primary} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEnrollStep(2)}
                  style={[styles.wizardNextBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.wizardNextBtnText}>I've Added the Key →</Text>
                </TouchableOpacity>
              </>
            )}

            {enrollStep === 2 && (
              <>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepNumber, { color: theme.primary }]}>STEP 2 OF 3</Text>
                  <Text style={[styles.wizardTitle, { color: theme.textPrimary }]}>Verify 6-Digit Code</Text>
                  <Text style={[styles.wizardSubtitle, { color: theme.textSecondary }]}>
                    Enter the rotating 6-digit code currently shown in your authenticator app:
                  </Text>
                </View>

                <TextInput
                  style={[styles.codeInput, { backgroundColor: theme.cardSecondary, borderColor: theme.primary, color: theme.textPrimary }]}
                  placeholder="000000"
                  placeholderTextColor={theme.textMuted}
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={verifying}
                  onPress={handleConfirmCode}
                  style={[styles.wizardNextBtn, { backgroundColor: theme.primary }]}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.wizardNextBtnText}>Verify & Enable 2FA</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {enrollStep === 3 && (
              <>
                <View style={styles.stepHeader}>
                  <CheckCircle2 size={36} color={theme.success} style={{ alignSelf: "center", marginBottom: 8 }} />
                  <Text style={[styles.wizardTitle, { color: theme.textPrimary, textAlign: "center" }]}>
                    2FA Successfully Enabled!
                  </Text>
                  <Text style={[styles.wizardSubtitle, { color: theme.textSecondary, textAlign: "center" }]}>
                    Save these 8 single-use recovery codes in case you lose access to your authenticator:
                  </Text>
                </View>

                <View style={[styles.recoveryGrid, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  {recoveryCodes.map((code, idx) => (
                    <Text key={idx} style={[styles.recoveryCode, { color: theme.textPrimary }]}>
                      {idx + 1}. {code}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={copyAllRecoveryCodes}
                  style={[styles.secondaryBtn, { backgroundColor: theme.primarySubtle, borderColor: theme.primary, marginBottom: 12 }]}
                >
                  {copiedCodes ? <Check size={16} color={theme.success} /> : <Copy size={16} color={theme.primary} />}
                  <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Copy All Recovery Codes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setEnrollModalVisible(false)}
                  style={[styles.wizardNextBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.wizardNextBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal visible={disableModalVisible} animationType="fade" transparent onRequestClose={() => setDisableModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.wizardTitle, { color: theme.danger }]}>Turn Off 2FA?</Text>
            <Text style={[styles.wizardSubtitle, { color: theme.textSecondary }]}>
              Enter your current 6-digit TOTP or backup code to confirm removal:
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="000000"
              placeholderTextColor={theme.textMuted}
              value={disableCode}
              onChangeText={setDisableCode}
              keyboardType="number-pad"
              maxLength={8}
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => setDisableModalVisible(false)}
                style={[styles.secondaryBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border, flex: 1 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={disabling}
                onPress={handleDisableMfa}
                style={[styles.dangerBtn, { backgroundColor: theme.danger, borderColor: theme.danger, flex: 1 }]}
              >
                {disabling ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={{ color: "#ffffff", fontWeight: "800" }}>Disable</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "800" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statusCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 16, fontWeight: "800" },
  statusSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
  },
  dangerBtnText: { fontSize: 13, fontWeight: "700" },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  infoTitle: { fontSize: 14, fontWeight: "800" },
  infoDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  appList: { marginTop: 10, gap: 4 },
  appItem: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 20 },
  stepHeader: { marginBottom: 16 },
  stepNumber: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  wizardTitle: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  wizardSubtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  keyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  secretKeyText: { fontSize: 14, fontWeight: "700", letterSpacing: 1.5, flex: 1 },
  copyBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  wizardNextBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  wizardNextBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  codeInput: {
    borderWidth: 2,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
    paddingVertical: 14,
    marginBottom: 20,
  },
  recoveryGrid: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recoveryCode: { width: "48%", fontSize: 13, fontWeight: "700", fontFamily: "monospace" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 4,
    marginVertical: 16,
  },
});
