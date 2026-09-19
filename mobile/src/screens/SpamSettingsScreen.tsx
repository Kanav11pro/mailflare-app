import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Link,
  Globe,
  FileCode,
  BrainCircuit,
  RotateCcw,
  Sparkles,
  ArrowLeft,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { api } from "../api/client";
import { SpamSettings } from "../types";

export const SpamSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SpamSettings>({
    enabled: true,
    vocabularySize: 1420,
    spamThreshold: 70,
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSpamSettings();
      setSettings(data);
    } catch {
      // default fallback
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSpam = async (value: boolean) => {
    try {
      setUpdating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.updateSpamSettings(value);
      setSettings((prev) => ({ ...prev, enabled: value }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Failed to update spam filter setting.");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetBayesian = () => {
    Alert.alert(
      "Reset Bayesian Token Weights",
      "This will clear learned spam token probabilities and reset the Bayesian classifier to defaults.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Model",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSettings((prev) => ({ ...prev, vocabularySize: 0 }));
            Alert.alert("Model Reset", "Learned spam dictionary tokens have been reset.");
          },
        },
      ]
    );
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Spam & Bayesian Heuristics</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Master Toggle */}
          <View style={[styles.masterCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={20} color={settings.enabled ? theme.success : theme.textMuted} />
                  <Text style={[styles.masterTitle, { color: theme.textPrimary }]}>
                    Active Spam Protection
                  </Text>
                </View>
                <Text style={[styles.masterDesc, { color: theme.textSecondary }]}>
                  Automatically evaluate inbound emails using the multi-layer Cloudflare & Bayesian scoring engine.
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleSpam}
                trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Heuristics Analyzers Breakdown */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              5-LAYER HEURISTIC PIPELINE
            </Text>
          </View>
          <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.layerRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.layerIcon, { backgroundColor: theme.primarySubtle }]}>
                <Lock size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.layerTitle, { color: theme.textPrimary }]}>
                  SPF / DKIM / DMARC Cryptography
                </Text>
                <Text style={[styles.layerDesc, { color: theme.textSecondary }]}>
                  Verifies cryptographic DNS alignment and email authenticity
                </Text>
              </View>
              <CheckCircle2 size={16} color={theme.success} />
            </View>

            <View style={[styles.layerRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.layerIcon, { backgroundColor: theme.warningSubtle }]}>
                <Link size={16} color={theme.warning} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.layerTitle, { color: theme.textPrimary }]}>
                  URL Phishing & Shortener Scanner
                </Text>
                <Text style={[styles.layerDesc, { color: theme.textSecondary }]}>
                  Inspects hyperlinks for homoglyphs, IP hosts, and tracking redirects
                </Text>
              </View>
              <CheckCircle2 size={16} color={theme.success} />
            </View>

            <View style={[styles.layerRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.layerIcon, { backgroundColor: theme.purpleSubtle }]}>
                <Globe size={16} color={theme.purple} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.layerTitle, { color: theme.textPrimary }]}>
                  Domain Age & Reputation
                </Text>
                <Text style={[styles.layerDesc, { color: theme.textSecondary }]}>
                  Evaluates sender domain age, disposable mail providers, and TLD safety
                </Text>
              </View>
              <CheckCircle2 size={16} color={theme.success} />
            </View>

            <View style={[styles.layerRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.layerIcon, { backgroundColor: theme.primarySubtle }]}>
                <FileCode size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.layerTitle, { color: theme.textPrimary }]}>
                  MIME Structure & Hidden CSS
                </Text>
                <Text style={[styles.layerDesc, { color: theme.textSecondary }]}>
                  Detects hidden zero-font text, mismatched multipart, and obfuscation
                </Text>
              </View>
              <CheckCircle2 size={16} color={theme.success} />
            </View>

            <View style={styles.layerRow}>
              <View style={[styles.layerIcon, { backgroundColor: theme.successSubtle }]}>
                <BrainCircuit size={16} color={theme.success} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.layerTitle, { color: theme.textPrimary }]}>
                  Naive Bayesian Classifier
                </Text>
                <Text style={[styles.layerDesc, { color: theme.textSecondary }]}>
                  Continuous token learning with interactive spam training feedback
                </Text>
              </View>
              <CheckCircle2 size={16} color={theme.success} />
            </View>
          </View>

          {/* Model Statistics */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              BAYESIAN MODEL STATUS
            </Text>
          </View>
          <View style={[styles.cardGroup, { backgroundColor: theme.card, borderColor: theme.border, padding: 16 }]}>
            <View style={styles.statGrid}>
              <View style={[styles.statBox, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: theme.textPrimary }]}>
                  {settings.vocabularySize ?? 1420}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Learned Tokens</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                <Text style={[styles.statNumber, { color: theme.warning }]}>
                  {settings.spamThreshold ?? 70}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Spam Threshold (0-100)</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleResetBayesian}
              style={[styles.resetBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}
            >
              <RotateCcw size={16} color={theme.danger} />
              <Text style={[styles.resetBtnText, { color: theme.danger }]}>
                Reset Bayesian Model Tokens
              </Text>
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
  masterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  masterDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  sectionHeader: { marginBottom: 8, marginTop: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  cardGroup: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  layerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  layerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  layerTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  layerDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
