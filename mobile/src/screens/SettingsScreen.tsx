import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldCheck,
  ShieldAlert,
  FileSignature,
  Plane,
  Filter,
  Globe,
  Lock,
  Fingerprint,
  ScanFace,
  Bell,
  HardDrive,
  Trash2,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme, ThemeMode } from "../context/theme-context";
import { useAuth } from "../context/auth-context";
import { useBiometric } from "../context/biometric-context";
import { Avatar } from "../components/Avatar";
import { getCacheSizeFormatted, clearAllCache } from "../lib/cache";
import { registerForPushNotifications } from "../lib/notifications";

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, mode, setMode } = useAppTheme();
  const { user, serverUrl, mailboxes, logout } = useAuth();
  const {
    isBiometricSupported,
    isBiometricEnabled,
    biometricType,
    setBiometricEnabled,
  } = useBiometric();

  const [cacheSize, setCacheSize] = useState<string>("Calculating...");
  const [pushStatus, setPushStatus] = useState<string>("Active");

  useEffect(() => {
    async function loadStats() {
      const size = await getCacheSizeFormatted();
      setCacheSize(size);
    }
    loadStats();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await setBiometricEnabled(value);
    if (!success && value) {
      Alert.alert(
        "Authentication Required",
        `Could not verify ${biometricType}. Lock was not enabled.`
      );
    }
  };

  const handleTestPush = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const token = await registerForPushNotifications();
    if (token) {
      setPushStatus("Registered");
      Alert.alert("Push Notifications", "Device token registered with Mailflare server.");
    } else {
      Alert.alert(
        "Push Notifications",
        "Android remote push notifications require a Development Build (EAS / APK) with FCM credentials in Expo SDK 53+. Push notification handlers are active for standalone builds."
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Offline Cache",
      "This will remove stored offline messages. Fresh emails will be fetched on next connection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await clearAllCache();
            const newSize = await getCacheSizeFormatted();
            setCacheSize(newSize);
            Alert.alert("Cache Cleared", "Offline message storage has been purged.");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Mailflare?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Avatar name={user?.name || user?.email || "User"} email={user?.email || ""} size={56} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
              {user?.name || user?.email?.split("@")[0] || "User"}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: theme.primarySubtle }]}>
              <Text style={[styles.roleText, { color: theme.primary }]}>
                {user?.role?.toUpperCase() || "USER"} ACCOUNT
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Theme & Appearance Selector */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE & THEME</Text>
        </View>
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.themeRow}>
            {(
              [
                { id: "system", label: "System", icon: Smartphone },
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "obsidian", label: "Obsidian", icon: Sparkles },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isSelected = mode === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMode(t.id);
                  }}
                  style={[
                    styles.themePill,
                    {
                      backgroundColor: isSelected ? theme.primarySubtle : theme.cardSecondary,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Icon size={16} color={isSelected ? theme.primary : theme.textSecondary} />
                  <Text style={[styles.themePillText, { color: isSelected ? theme.primary : theme.textPrimary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Account & Identity Hub */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT & IDENTITY</Text>
        </View>
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("AccountSecurity");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
              <Lock size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Account & Password Security</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Display name, password update, inbound forwarding
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Signatures");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
              <FileSignature size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Sender Identity & Signatures</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Display names, email signatures, domain aliases
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("AutoReply");
            }}
            style={styles.rowItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.successSubtle }]}>
              <Plane size={18} color={theme.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Vacation Responder</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Automatic out-of-office auto-replies
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 3. Security & Privacy */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SECURITY & PRIVACY</Text>
        </View>
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("MfaSecurity");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
              <ShieldCheck size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Two-Factor Authentication</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                RFC 6238 TOTP authenticator & backup codes
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("SpamSettings");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.warningSubtle }]}>
              <ShieldAlert size={18} color={theme.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Spam & Bayesian Heuristics</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                5-layer filter pipeline, score thresholds, token weights
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("MaskedAliases");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.purpleSubtle }]}>
              <Zap size={18} color={theme.purple} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Masked Burner Aliases</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Single-purpose disposable emails & tracking shields
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {isBiometricSupported && (
            <View style={styles.rowItem}>
              <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
                {biometricType === "Face ID" ? (
                  <ScanFace size={18} color={theme.primary} />
                ) : (
                  <Fingerprint size={18} color={theme.primary} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>
                  {biometricType} App Lock
                </Text>
                <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                  Require biometric authentication on app open
                </Text>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          )}
        </View>

        {/* 4. Rules, Domains & Telemetry */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>RULES, DOMAINS & TELEMETRY</Text>
        </View>
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("RoutingRules");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
              <Filter size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Email Routing Rules</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Custom pattern matchers, forwarding, sorting
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("DomainDns");
            }}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.successSubtle }]}>
              <Globe size={18} color={theme.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Domain & DNS Diagnostics</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                MX, SPF, DKIM, DMARC Cloudflare status
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Webhooks");
            }}
            style={styles.rowItem}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.purpleSubtle }]}>
              <Zap size={18} color={theme.purple} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Webhooks & Event Telemetry</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>
                Delivery logs, endpoint monitors, real-time webhooks
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 5. Device & Storage */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DEVICE & STORAGE</Text>
        </View>
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={handleTestPush}
            style={[styles.rowItem, { borderBottomColor: theme.border }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
              <Bell size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Push Notifications</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Status: {pushStatus}</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearCache} style={styles.rowItem}>
            <View style={[styles.iconCircle, { backgroundColor: theme.warningSubtle }]}>
              <HardDrive size={18} color={theme.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Offline Cache</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Using {cacheSize}</Text>
            </View>
            <Trash2 size={16} color={theme.danger} />
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Card */}
        <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
          <View style={styles.rowItem}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.textSecondary, fontSize: 11, fontWeight: "800" }]}>
                CONNECTED INSTANCE
              </Text>
              <Text style={[styles.rowDesc, { color: theme.textMuted, marginTop: 2, fontFamily: "monospace" }]}>
                {serverUrl}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: theme.dangerSubtle, borderColor: theme.danger }]}
        >
          <LogOut size={18} color={theme.danger} />
          <Text style={[styles.logoutBtnText, { color: theme.danger }]}>Sign Out of Mailflare</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  navbar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: { fontSize: 20, fontWeight: "900" },
  scrollContent: { padding: 16, paddingBottom: 60 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  userName: { fontSize: 17, fontWeight: "800" },
  userEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  sectionHeader: { marginBottom: 8, marginTop: 14, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  cardGroup: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  themePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themePillText: { fontSize: 11, fontWeight: "700" },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowDesc: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 24,
  },
  logoutBtnText: { fontSize: 14, fontWeight: "800" },
});
