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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  FileSignature,
  Save,
  Check,
  Mail,
  User,
  Globe,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { MailboxDetail } from "../types";

export const SignaturesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { mailboxes, selectedMailbox } = useAuth();

  const [activeMailboxId, setActiveMailboxId] = useState<string>(
    selectedMailbox?.id || mailboxes[0]?.id || ""
  );
  const [mailboxDetail, setMailboxDetail] = useState<MailboxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [signature, setSignature] = useState("");
  const [useAllDomains, setUseAllDomains] = useState(true);

  const fetchMailbox = useCallback(async () => {
    if (!activeMailboxId) return;
    try {
      setLoading(true);
      const data = await api.getMailbox(activeMailboxId);
      setMailboxDetail(data);
      setDisplayName(data.displayName || "");
      setSignature(data.signature || "");
      setUseAllDomains(data.useAllDomains !== false);
    } catch (err: any) {
      console.error("Failed to load mailbox signature:", err);
      Alert.alert("Error", err.message || "Could not fetch mailbox details.");
    } finally {
      setLoading(false);
    }
  }, [activeMailboxId]);

  useEffect(() => {
    fetchMailbox();
  }, [fetchMailbox]);

  const handleSave = async () => {
    if (!activeMailboxId) return;
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.updateMailbox(activeMailboxId, {
        displayName: displayName.trim() || undefined,
        signature: signature.trim() || "",
        useAllDomains,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Mailbox identity & signature updated.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Could not update signature.");
    } finally {
      setSaving(false);
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Identity & Signatures</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={saving || loading}
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Save size={18} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Mailbox Selector */}
          {mailboxes.length > 1 && (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>SELECT IDENTITY</Text>
              <View style={styles.mailboxList}>
                {mailboxes.map((mb) => {
                  const isSelected = mb.id === activeMailboxId;
                  return (
                    <TouchableOpacity
                      key={mb.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setActiveMailboxId(mb.id);
                      }}
                      style={[
                        styles.mailboxPill,
                        {
                          backgroundColor: isSelected ? theme.primarySubtle : theme.cardSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Mail size={14} color={isSelected ? theme.primary : theme.textSecondary} />
                      <Text style={[styles.mailboxPillText, { color: isSelected ? theme.primary : theme.textPrimary }]}>
                        {mb.localPart}@{mb.hostname || "mail.studyholic.xyz"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Display Name Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>SENDER DISPLAY NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. Alex Miller"
              placeholderTextColor={theme.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={[styles.fieldHint, { color: theme.textMuted }]}>
              Appears in the "From" header of outbound emails.
            </Text>
          </View>

          {/* Signature Editor */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>EMAIL SIGNATURE</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="--&#10;Alex Miller&#10;Engineering Lead | Mailflare"
              placeholderTextColor={theme.textMuted}
              value={signature}
              onChangeText={setSignature}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Live Preview Card */}
          {signature.trim().length > 0 && (
            <View style={[styles.previewCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Sparkles size={14} color={theme.primary} />
                <Text style={[styles.previewLabel, { color: theme.primary }]}>SIGNATURE PREVIEW</Text>
              </View>
              <Text style={[styles.previewBody, { color: theme.textPrimary }]}>
                {signature}
              </Text>
            </View>
          )}

          {/* Use All Domains Switch */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.switchRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View style={[styles.iconCircle, { backgroundColor: theme.primarySubtle }]}>
                  <Globe size={22} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Receive on All Domains</Text>
                  <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                    Accept emails sent to this local-part across every active domain zone.
                  </Text>
                </View>
              </View>
              <Switch
                value={useAllDomains}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setUseAllDomains(val);
                }}
                trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={saving}
            onPress={handleSave}
            style={[styles.fullSaveBtn, { backgroundColor: theme.primary }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Check size={18} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.fullSaveBtnText}>Save Identity Changes</Text>
              </>
            )}
          </TouchableOpacity>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "800" },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 6,
  },
  mailboxList: { gap: 8 },
  mailboxPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  mailboxPillText: { fontSize: 13, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  previewBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  switchTitle: { fontSize: 15, fontWeight: "800" },
  switchDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  fullSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  fullSaveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
