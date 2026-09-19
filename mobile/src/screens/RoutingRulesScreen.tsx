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
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Filter,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  RotateCw,
  AlertTriangle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { RoutingRule } from "../types";

export const RoutingRulesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { mailboxes, selectedMailbox } = useAuth();

  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [matchField, setMatchField] = useState<"from" | "to" | "subject" | "header">("from");
  const [matchOperator, setMatchOperator] = useState<"contains" | "equals" | "starts_with" | "ends_with" | "regex">("contains");
  const [matchValue, setMatchValue] = useState("");
  const [action, setAction] = useState<"store" | "forward" | "reject">("store");
  const [forwardTo, setForwardTo] = useState("");
  const [priority, setPriority] = useState("10");
  const [creating, setCreating] = useState(false);

  const fetchRules = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setFetchError(null);
      const data = await api.getRoutingRules();
      setRules(data || []);
    } catch (err: any) {
      console.error("Failed to load routing rules:", err);
      setFetchError(err.message || "Failed to load routing rules.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleRule = async (rule: RoutingRule) => {
    const nextEnabled = !rule.enabled;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: nextEnabled } : r))
    );
    try {
      await api.updateRoutingRule(rule.id, { enabled: nextEnabled });
    } catch {
      fetchRules();
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    Alert.alert("Delete Rule", "Are you sure you want to permanently delete this routing rule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setRules((prev) => prev.filter((r) => r.id !== ruleId));
          try {
            await api.deleteRoutingRule(ruleId);
          } catch {
            fetchRules();
          }
        },
      },
    ]);
  };

  const handleCreateRule = async () => {
    if (!matchValue.trim()) {
      Alert.alert("Value Required", "Please specify the matching pattern/value.");
      return;
    }

    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const targetDomainId = selectedMailbox?.domainId || rules[0]?.domainId || "default";

      const created = await api.createRoutingRule({
        domainId: targetDomainId,
        mailboxId: selectedMailbox?.id,
        name: ruleName.trim() || undefined,
        pattern: matchValue.trim(),
        matchField,
        matchOperator,
        matchValue: matchValue.trim(),
        action,
        forwardTo: action === "forward" ? forwardTo.trim() : undefined,
        priority: parseInt(priority, 10) || 10,
        enabled: true,
      });

      setRules((prev) => [created, ...prev]);
      setModalVisible(false);
      setRuleName("");
      setMatchValue("");
      setForwardTo("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message || "Could not save routing rule.");
    } finally {
      setCreating(false);
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
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Routing Rules</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Plus size={18} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Rules List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.centerBox}>
          <AlertTriangle size={40} color={theme.warning} />
          <Text style={[styles.errorTitle, { color: theme.warning }]}>Could Not Load Rules</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>{fetchError}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchRules();
            }}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
            <RotateCw size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.centerBox}>
          <Filter size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Routing Rules</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create custom filter rules to automatically sort, forward, or reject matching incoming mail.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
            style={[styles.emptyCreateBtn, { backgroundColor: theme.primary }]}
          >
            <Plus size={16} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.emptyCreateBtnText}>Create First Rule</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRules(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {rules.map((rule) => {
            const actionColors = {
              store: theme.success,
              forward: theme.primary,
              reject: theme.danger,
            };
            const actionSubtles = {
              store: theme.successSubtle,
              forward: theme.primarySubtle,
              reject: theme.dangerSubtle,
            };

            return (
              <View
                key={rule.id}
                style={[
                  styles.ruleCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {/* Header Row */}
                <View style={styles.ruleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: theme.textPrimary }]}>
                      {rule.name || `Rule: ${rule.matchField} ${rule.matchOperator}`}
                    </Text>
                    <Text style={[styles.ruleCondition, { color: theme.textSecondary }]}>
                      IF {rule.matchField.toUpperCase()} {rule.matchOperator.toUpperCase()} "{rule.matchValue}"
                    </Text>
                  </View>

                  <Switch
                    value={rule.enabled}
                    onValueChange={() => handleToggleRule(rule)}
                    trackColor={{ false: theme.cardSecondary, true: theme.primary }}
                    thumbColor="#ffffff"
                  />
                </View>

                {/* Footer Action & Priority Pill */}
                <View style={styles.ruleFooter}>
                  <View
                    style={[
                      styles.actionBadge,
                      { backgroundColor: actionSubtles[rule.action] || theme.primarySubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBadgeText,
                        { color: actionColors[rule.action] || theme.primary },
                      ]}
                    >
                      ACTION: {rule.action.toUpperCase()}
                      {rule.forwardTo ? ` → ${rule.forwardTo}` : ""}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.priorityText, { color: theme.textMuted }]}>
                      P{rule.priority}
                    </Text>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Rule Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Routing Rule</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>RULE NAME (OPTIONAL)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. VIP Client Forwarder"
                placeholderTextColor={theme.textMuted}
                value={ruleName}
                onChangeText={setRuleName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>MATCH FIELD</Text>
              <View style={styles.fieldSelector}>
                {(["from", "to", "subject"] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setMatchField(f)}
                    style={[
                      styles.selectorPill,
                      {
                        backgroundColor: matchField === f ? theme.primarySubtle : theme.cardSecondary,
                        borderColor: matchField === f ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.selectorPillText, { color: matchField === f ? theme.primary : theme.textSecondary }]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>MATCH OPERATOR</Text>
              <View style={styles.fieldSelector}>
                {(["contains", "equals", "starts_with", "regex"] as const).map((op) => (
                  <TouchableOpacity
                    key={op}
                    onPress={() => setMatchOperator(op)}
                    style={[
                      styles.selectorPill,
                      {
                        backgroundColor: matchOperator === op ? theme.primarySubtle : theme.cardSecondary,
                        borderColor: matchOperator === op ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.selectorPillText, { color: matchOperator === op ? theme.primary : theme.textSecondary }]}>
                      {op}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>VALUE / PATTERN</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
                placeholder="e.g. @partner-domain.com or [Invoice]"
                placeholderTextColor={theme.textMuted}
                value={matchValue}
                onChangeText={setMatchValue}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ACTION</Text>
              <View style={styles.fieldSelector}>
                {(["store", "forward", "reject"] as const).map((act) => (
                  <TouchableOpacity
                    key={act}
                    onPress={() => setAction(act)}
                    style={[
                      styles.selectorPill,
                      {
                        backgroundColor: action === act ? theme.primarySubtle : theme.cardSecondary,
                        borderColor: action === act ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.selectorPillText, { color: action === act ? theme.primary : theme.textSecondary }]}>
                      {act.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {action === "forward" && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FORWARD TO EMAIL</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="forward-target@company.com"
                    placeholderTextColor={theme.textMuted}
                    value={forwardTo}
                    onChangeText={setForwardTo}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={creating}
                onPress={handleCreateRule}
                style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Routing Rule</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 },
  errorTitle: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  errorSubtitle: { fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  retryBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18 },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 20,
  },
  emptyCreateBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  ruleCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  ruleTitle: { fontSize: 15, fontWeight: "800" },
  ruleCondition: { fontSize: 12, marginTop: 2, fontFamily: "monospace" },
  ruleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.15)",
  },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionBadgeText: { fontSize: 10, fontWeight: "800" },
  priorityText: { fontSize: 11, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorPillText: { fontSize: 11, fontWeight: "700" },
  modalSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});
