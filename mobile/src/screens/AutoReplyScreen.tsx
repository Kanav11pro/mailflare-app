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
  Plane,
  Save,
  Check,
  Mail,
  ChevronDown,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { MailboxDetail } from "../types";

export const AutoReplyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { mailboxes, selectedMailbox } = useAuth();

  const [activeMailboxId, setActiveMailboxId] = useState<string>(
    selectedMailbox?.id || mailboxes[0]?.id || ""
  );
  const [mailboxDetail, setMailboxDetail] = useState<MailboxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("Out of office");
  const [body, setBody] = useState("");

  const fetchMailbox = useCallback(async () => {
    if (!activeMailboxId) return;
    try {
      setLoading(true);
      const data = await api.getMailbox(activeMailboxId);
      setMailboxDetail(data);
      setEnabled(!!data.autoReplyEnabled);
      setSubject(data.autoReplySubject || "Out of office");
      setBody(data.autoReplyBody || "");
    } catch (err: any) {
      console.error("Failed to load mailbox:", err);
      Alert.alert("Error", err.message || "Could not fetch mailbox settings.");
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
        autoReplyEnabled: enabled,
        autoReplySubject: subject.trim() || "Out of office",
        autoReplyBody: body.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Vacation responder configuration updated successfully.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Failed to update vacation responder.");
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Vacation Responder</Text>
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
              <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>SELECT MAILBOX</Text>
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

          {/* Toggle Switch Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.switchRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View style={[styles.iconCircle, { backgroundColor: enabled ? theme.successSubtle : theme.primarySubtle }]}>
                  <Plane size={22} color={enabled ? theme.success : theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: theme.textPrimary }]}>Automatic Auto-Reply</Text>
                  <Text style={[styles.switchDesc, { color: theme.textSecondary }]}>
                    Automatically reply once per recipient when new emails arrive.
                  </Text>
                </View>
              </View>
              <Switch
                value={enabled}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEnabled(val);
                }}
                trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Subject & Body Editor */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>SUBJECT LINE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Out of office"
              placeholderTextColor={theme.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={[styles.cardLabel, { color: theme.textSecondary, marginTop: 16 }]}>AUTO-REPLY MESSAGE</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="Thank you for your message. I am currently out of office with limited email access..."
              placeholderTextColor={theme.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Save Action Banner */}
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
                <Text style={styles.fullSaveBtnText}>Save Vacation Responder</Text>
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
    minHeight: 120,
  },
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
