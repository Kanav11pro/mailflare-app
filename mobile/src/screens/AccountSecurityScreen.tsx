import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
  User,
  KeyRound,
  Mail,
  Send,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { UserAccountProfile } from "../types";

export const AccountSecurityScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserAccountProfile | null>(null);

  // Profile Form
  const [name, setName] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Email Forwarding
  const [forwardingEnabled, setForwardingEnabled] = useState(false);
  const [forwardingEmail, setForwardingEmail] = useState("");
  const [savingForwarding, setSavingForwarding] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAccountProfile();
      setProfile(data);
      setName(data.name || "");
      setResetEmail(data.resetEmail || "");
      setForwardingEmail(data.forwardingEmail || "");
      setForwardingEnabled(!!data.forwardingEmail);
    } catch {
      // Fallback from auth context if endpoint isn't loaded
      setName(authUser?.name || "");
      setResetEmail("");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Invalid Input", "Please enter a valid display name.");
      return;
    }
    try {
      setSavingProfile(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await api.updateAccountProfile({
        name: name.trim(),
        resetEmail: resetEmail.trim() || undefined,
      });
      setProfile(res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Account profile updated successfully.");
    } catch (err: any) {
      Alert.alert("Update Failed", err.message || "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveForwarding = async () => {
    try {
      setSavingForwarding(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const destination = forwardingEnabled ? forwardingEmail.trim() : "";
      const res = await api.updateAccountProfile({
        forwardingEmail: destination,
      });
      setProfile(res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Forwarding Updated",
        forwardingEnabled
          ? `Incoming messages will now also copy to ${destination}`
          : "Email forwarding has been disabled."
      );
    } catch (err: any) {
      Alert.alert("Forwarding Error", err.message || "Could not update email forwarding.");
    } finally {
      setSavingForwarding(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Missing Current Password", "Please enter your current account password.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "The new passwords do not match. Please re-enter.");
      return;
    }

    try {
      setSavingPassword(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.changePassword(currentPassword, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(
        "Password Changed",
        "Your password has been updated. Other active sessions have been signed out for security."
      );
    } catch (err: any) {
      Alert.alert("Password Error", err.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Account & Password</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Account Details */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT DETAILS</Text>
          </View>
          <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Primary Email</Text>
              <Text style={[styles.fieldValueReadOnly, { color: theme.textPrimary }]}>
                {profile?.email || authUser?.email}
              </Text>
            </View>

            <View style={[styles.inputDivider, { backgroundColor: theme.border }]} />

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.textPrimary }]}
                placeholder="Your full name"
                placeholderTextColor={theme.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={[styles.inputDivider, { backgroundColor: theme.border }]} />

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Recovery Email</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.textPrimary }]}
                placeholder="Optional backup email"
                placeholderTextColor={theme.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile Details</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Email Forwarding */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INBOUND EMAIL FORWARDING</Text>
          </View>
          <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>
                  Forward Incoming Mail
                </Text>
                <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                  Send an automatic copy of incoming messages to an external address
                </Text>
              </View>
              <Switch
                value={forwardingEnabled}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  setForwardingEnabled(val);
                }}
                trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {forwardingEnabled && (
              <>
                <View style={[styles.inputDivider, { backgroundColor: theme.border }]} />
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Forward To</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: theme.textPrimary }]}
                    placeholder="e.g. personal@gmail.com"
                    placeholderTextColor={theme.textMuted}
                    value={forwardingEmail}
                    onChangeText={setForwardingEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSaveForwarding}
                  disabled={savingForwarding}
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                >
                  {savingForwarding ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Forwarding Destination</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Change Password */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>CHANGE SIGN-IN PASSWORD</Text>
          </View>
          <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Current Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.fieldInput, { color: theme.textPrimary, flex: 1 }]}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputDivider, { backgroundColor: theme.border }]} />

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>New Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.fieldInput, { color: theme.textPrimary, flex: 1 }]}
                  placeholder="Min 8 characters"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputDivider, { backgroundColor: theme.border }]} />

            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.fieldInput, { color: theme.textPrimary }]}
                placeholder="Re-enter new password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showNew}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangePassword}
              disabled={savingPassword}
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Update Account Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "800" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 60 },
  sectionHeader: { marginBottom: 8, marginTop: 14, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  cardGroup: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
  },
  fieldRow: {
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValueReadOnly: {
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
  },
  fieldInput: {
    fontSize: 14,
    paddingVertical: 6,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
