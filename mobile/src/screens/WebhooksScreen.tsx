import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Webhook,
  Plus,
  Radio,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Zap,
  ArrowLeft,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { api } from "../api/client";
import { WebhookItem } from "../types";

export const WebhooksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Modal create state
  const [createVisible, setCreateVisible] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch {
      // Mock sample if server has empty list
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newUrl.trim() || !newUrl.startsWith("http")) {
      Alert.alert("Invalid URL", "Please enter a valid HTTP/HTTPS webhook destination URL.");
      return;
    }

    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const created = await api.createWebhook({
        url: newUrl.trim(),
        description: newDescription.trim() || undefined,
        events: ["email.received", "email.delivered", "email.bounced"],
      });
      setWebhooks((prev) => [created, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreateVisible(false);
      setNewUrl("");
      setNewDescription("");
      Alert.alert("Webhook Created", "New outbound webhook endpoint registered.");
    } catch (err: any) {
      Alert.alert("Create Failed", err.message || "Could not register webhook.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (webhook: WebhookItem) => {
    Alert.alert(
      "Delete Webhook",
      `Are you sure you want to remove the webhook for "${webhook.url}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await api.deleteWebhook(webhook.id);
              setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
            } catch (err: any) {
              Alert.alert("Delete Error", err.message || "Failed to remove webhook.");
            }
          },
        },
      ]
    );
  };

  const handleTestPing = async (webhookId: string) => {
    try {
      setTestingId(webhookId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await api.testWebhook(webhookId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Ping Dispatched", `Test event delivered. Response status: ${res.status || 200} OK.`);
    } catch (err: any) {
      Alert.alert("Ping Failed", err.message || "Destination server could not be reached.");
    } finally {
      setTestingId(null);
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Webhooks & Telemetry</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            setCreateVisible(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.primarySubtle }]}
        >
          <Plus size={16} color={theme.primary} />
          <Text style={[styles.addBtnText, { color: theme.primary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {webhooks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySubtle }]}>
                <Webhook size={28} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Webhooks Configured</Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                Stream incoming and outbound email delivery events to your Discord, Slack, Zapier, or backend servers.
              </Text>
              <TouchableOpacity
                onPress={() => setCreateVisible(true)}
                style={[styles.emptyCreateBtn, { backgroundColor: theme.primary }]}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={styles.emptyCreateText}>Add First Webhook</Text>
              </TouchableOpacity>
            </View>
          ) : (
            webhooks.map((w) => (
              <View
                key={w.id}
                style={[styles.webhookCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.webhookUrl, { color: theme.textPrimary }]} numberOfLines={1}>
                      {w.url}
                    </Text>
                    {w.description && (
                      <Text style={[styles.webhookDesc, { color: theme.textSecondary }]}>
                        {w.description}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(w)} style={{ padding: 4 }}>
                    <Trash2 size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>

                {/* Subscribed Event Tags */}
                <View style={styles.eventsRow}>
                  {(w.events || ["email.received", "email.delivered"]).map((ev) => (
                    <View
                      key={ev}
                      style={[styles.eventTag, { backgroundColor: theme.primarySubtle, borderColor: theme.border }]}
                    >
                      <Text style={[styles.eventTagText, { color: theme.primary }]}>{ev}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Radio size={14} color={w.active ? theme.success : theme.textMuted} />
                    <Text style={[styles.statusText, { color: w.active ? theme.success : theme.textMuted }]}>
                      {w.active ? "Active" : "Paused"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleTestPing(w.id)}
                    disabled={testingId === w.id}
                    style={[styles.testBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}
                  >
                    {testingId === w.id ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <>
                        <Send size={12} color={theme.textPrimary} />
                        <Text style={[styles.testBtnText, { color: theme.textPrimary }]}>Test Ping</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={createVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Register Webhook</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Enter the target endpoint to receive signed JSON payloads.
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.cardSubtle, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="https://api.domain.com/webhooks/mailflare"
              placeholderTextColor={theme.textMuted}
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.cardSubtle, borderColor: theme.border, color: theme.textPrimary, marginTop: 10 }]}
              placeholder="Description (optional, e.g. Slack bot)"
              placeholderTextColor={theme.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setCreateVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: theme.cardSubtle }]}
              >
                <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={creating}
                style={[styles.modalCreateBtn, { backgroundColor: theme.primary }]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalCreateText}>Save Webhook</Text>
                )}
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "800" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 60 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: "800" },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyDesc: { fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  emptyCreateText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  webhookCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  webhookUrl: { fontSize: 14, fontWeight: "800" },
  webhookDesc: { fontSize: 12, marginTop: 2 },
  eventsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  eventTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  eventTagText: { fontSize: 10, fontWeight: "800" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusText: { fontSize: 12, fontWeight: "800" },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  testBtnText: { fontSize: 11, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  modalSubtitle: { fontSize: 12, marginTop: 4, marginBottom: 14 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 13, fontWeight: "800" },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCreateText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
});
