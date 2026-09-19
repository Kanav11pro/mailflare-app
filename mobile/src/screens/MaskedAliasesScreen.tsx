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
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Shield,
  Clock,
  Pause,
  Play,
  Trash2,
  X,
  Sparkles,
  ZapOff,
  AlertTriangle,
  RotateCw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "../api/client";
import { MaskedAlias } from "../types";
import { useAuth } from "../context/auth-context";
import { useAppTheme } from "../context/theme-context";

export const MaskedAliasesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();
  const { mailboxes, selectedMailbox } = useAuth();
  const [aliases, setAliases] = useState<MaskedAlias[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState<"24h" | "7d" | "30d" | "permanent">("30d");
  const [creating, setCreating] = useState(false);

  const fetchAliases = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      setFetchError(null);
      const data = await api.getMaskedAliases();
      setAliases(data || []);
    } catch (err: any) {
      console.error("Failed to load masked aliases:", err);
      setFetchError(err.message || "Failed to load masked aliases. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAliases();
  }, [fetchAliases]);

  const handleCopy = (alias: MaskedAlias) => {
    const fullAddr = `${alias.localPart}@${alias.domainHostname || "mail.studyholic.xyz"}`;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(alias.id);
    setTimeout(() => setCopiedId(null), 2000);
    Alert.alert("Copied to Clipboard", fullAddr);
  };

  const handleToggleStatus = async (alias: MaskedAlias) => {
    const nextStatus = alias.status === "active" ? "paused" : "active";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAliases((prev) =>
      prev.map((a) => (a.id === alias.id ? { ...a, status: nextStatus } : a))
    );
    try {
      await api.updateMaskedAlias(alias.id, nextStatus);
    } catch {
      fetchAliases();
    }
  };

  const handleKillAlias = (alias: MaskedAlias) => {
    Alert.alert(
      "Kill Masked Alias?",
      `Future emails sent to ${alias.localPart}@${alias.domainHostname || ""} will be permanently blocked.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kill Alias",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setAliases((prev) =>
              prev.map((a) => (a.id === alias.id ? { ...a, status: "killed" } : a))
            );
            try {
              await api.updateMaskedAlias(alias.id, "killed");
            } catch {
              fetchAliases();
            }
          },
        },
      ]
    );
  };

  const handleDeleteAlias = (aliasId: string) => {
    Alert.alert("Delete Alias", "Permanently remove this masked alias record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setAliases((prev) => prev.filter((a) => a.id !== aliasId));
          try {
            await api.deleteMaskedAlias(aliasId);
          } catch {
            fetchAliases();
          }
        },
      },
    ]);
  };

  const handleCreateAlias = async () => {
    if (!label.trim()) {
      Alert.alert("Required", "Please provide a label for this alias (e.g. Amazon Signup).");
      return;
    }

    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const created = await api.createMaskedAlias({
        label: label.trim(),
        mailboxId: selectedMailbox?.id,
        duration,
      });

      setAliases((prev) => [created, ...prev]);
      setModalVisible(false);
      setLabel("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message || "Could not generate masked alias");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Navbar */}
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.goBack()}
          style={styles.navBtn}
        >
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Masked Burner Aliases</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
          style={styles.navCreateBtn}
        >
          <Plus size={20} color={theme.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Hero Explainer Banner */}
      <View
        style={[
          styles.heroBanner,
          {
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)",
            borderColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.2)",
          },
        ]}
      >
        <View style={styles.heroIconCircle}>
          <Shield size={22} color={theme.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Hide Your Real Address</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textMuted }]}>
            Create single-purpose disposable burner emails that forward to your inbox. Kill or pause them anytime to eliminate spam.
          </Text>
        </View>
      </View>

      {/* Aliases List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.emptyBox}>
          <AlertTriangle size={40} color="#f59e0b" />
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Could Not Load Aliases</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>{fetchError}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setLoading(true);
              fetchAliases();
            }}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
            <RotateCw size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : aliases.length === 0 ? (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAliases(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <View style={styles.emptyBox}>
            <ZapOff size={44} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Masked Aliases Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Generate your first disposable alias for signups, trial accounts, or online shopping.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(true)}
              style={[styles.emptyCreateBtn, { backgroundColor: theme.primary }]}
            >
              <Plus size={16} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.emptyCreateText}>Create Burner Alias</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAliases(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {aliases.map((alias) => {
            const fullAddr = `${alias.localPart}@${alias.domainHostname || "mail.studyholic.xyz"}`;
            const isCopied = copiedId === alias.id;
            const isExpired = alias.expiresAt && new Date(alias.expiresAt).getTime() < Date.now();

            return (
              <View
                key={alias.id}
                style={[
                  styles.aliasCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Header Row: Label & Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Sparkles size={14} color={theme.primary} />
                    <Text style={[styles.cardLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                      {alias.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isExpired
                        ? styles.statusExpired
                        : alias.status === "active"
                        ? styles.statusActive
                        : alias.status === "paused"
                        ? styles.statusPaused
                        : styles.statusKilled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isExpired
                          ? styles.statusTextExpired
                          : alias.status === "active"
                          ? styles.statusTextActive
                          : alias.status === "paused"
                          ? styles.statusTextPaused
                          : styles.statusTextKilled,
                      ]}
                    >
                      {isExpired ? "EXPIRED" : alias.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Masked Address Capsule with Copy */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleCopy(alias)}
                  style={[
                    styles.addressBox,
                    {
                      backgroundColor: theme.cardSubtle,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.addressText, { color: theme.textPrimary }]} numberOfLines={1}>
                    {fullAddr}
                  </Text>
                  {isCopied ? (
                    <Check size={16} color="#34d399" />
                  ) : (
                    <Copy size={16} color={theme.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Expiry & Stats Row */}
                <View style={styles.metaRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={[styles.metaText, { color: theme.textMuted }]}>
                      {alias.expiresAt
                        ? `Expires: ${new Date(alias.expiresAt).toLocaleDateString()}`
                        : "Permanent"}
                    </Text>
                  </View>
                  <Text style={[styles.metaText, { color: theme.textMuted }]}>
                    {alias.forwardCount} forwarded • {alias.blockedCount} blocked
                  </Text>
                </View>

                {/* Action Controls */}
                <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                  {alias.status !== "killed" && !isExpired && (
                    <TouchableOpacity
                      onPress={() => handleToggleStatus(alias)}
                      style={[styles.actionBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}
                    >
                      {alias.status === "active" ? (
                        <>
                          <Pause size={13} color="#fbbf24" />
                          <Text style={[styles.actionBtnText, { color: "#fbbf24" }]}>Pause</Text>
                        </>
                      ) : (
                        <>
                          <Play size={13} color="#34d399" />
                          <Text style={[styles.actionBtnText, { color: "#34d399" }]}>Resume</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {alias.status !== "killed" && !isExpired && (
                    <TouchableOpacity
                      onPress={() => handleKillAlias(alias)}
                      style={[styles.actionBtn, styles.killBtn]}
                    >
                      <ZapOff size={13} color="#f87171" />
                      <Text style={[styles.actionBtnText, { color: "#f87171" }]}>Kill</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDeleteAlias(alias.id)}
                    style={[styles.actionBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border, marginLeft: "auto" }]}
                  >
                    <Trash2 size={13} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Generate Masked Alias Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Shield size={18} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Masked Alias</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>WHAT IS THIS ALIAS FOR?</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Amazon Signup, Gym Trial, Reddit"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.cardSubtle,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.textMuted, marginTop: 16 }]}>EXPIRATION TIMER</Text>
            <View style={styles.durationRow}>
              {(["24h", "7d", "30d", "permanent"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => {
                    setDuration(d);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.durationPill,
                    { backgroundColor: theme.cardSubtle, borderColor: theme.border },
                    duration === d && [styles.durationPillActive, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)", borderColor: theme.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      { color: theme.textMuted },
                      duration === d && [styles.durationPillTextActive, { color: theme.primary }],
                    ]}
                  >
                    {d === "24h"
                      ? "24 Hours"
                      : d === "7d"
                      ? "7 Days"
                      : d === "30d"
                      ? "30 Days"
                      : "Permanent"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCreateAlias}
              disabled={creating}
              style={[styles.modalCreateBtn, { backgroundColor: theme.primary }, creating && { opacity: 0.6 }]}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalCreateBtnText}>Generate Burner Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0c10",
  },
  navbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#0b0c10",
  },
  navBtn: {
    padding: 8,
  },
  navTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  navCreateBtn: {
    padding: 6,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13141d",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222534",
    gap: 14,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
  },
  errorTitle: {
    color: "#f59e0b",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 20,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 20,
  },
  emptyCreateText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  listScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  aliasCard: {
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardLabel: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  statusTextActive: {
    color: "#34d399",
  },
  statusPaused: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  statusTextPaused: {
    color: "#fbbf24",
  },
  statusKilled: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  statusTextKilled: {
    color: "#f87171",
  },
  statusExpired: {
    backgroundColor: "rgba(100, 116, 139, 0.12)",
    borderColor: "rgba(100, 116, 139, 0.25)",
  },
  statusTextExpired: {
    color: "#94a3b8",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  addressText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  killBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#13141d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222534",
    padding: 22,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  inputLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 14,
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  durationPill: {
    flex: 1,
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  durationPillActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: "#3b82f6",
  },
  durationPillText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  durationPillTextActive: {
    color: "#60a5fa",
  },
  modalCreateBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCreateBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
