import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import {
  Zap,
  ShieldCheck,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Clock,
  Send,
  Inbox,
  ExternalLink,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "../api/client";
import { DeliveryDiagnosticsDossier } from "../types";

interface DeliveryDiagnosticsSheetProps {
  visible: boolean;
  messageId: string | null;
  onClose: () => void;
}

export const DeliveryDiagnosticsSheet: React.FC<DeliveryDiagnosticsSheetProps> = ({
  visible,
  messageId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<DeliveryDiagnosticsDossier | null>(null);

  useEffect(() => {
    if (visible && messageId) {
      setLoading(true);
      api
        .getDeliveryDiagnostics(messageId)
        .then((data) => {
          setDossier(data);
        })
        .catch((err) => {
          console.warn("Failed to load delivery diagnostics:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDossier(null);
    }
  }, [visible, messageId]);

  if (!visible) return null;

  const handleOpenLink = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Link", url);
      }
    } catch {
      Alert.alert("Link", url);
    }
  };

  const isBounced = dossier?.status === "bounced";
  const isComplained = dossier?.status === "complained";
  const isDelivered =
    dossier?.status === "delivered" ||
    (dossier?.engagement?.openCount ?? 0) > 0 ||
    (dossier?.engagement?.clickCount ?? 0) > 0;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Top Grabber */}
              <View style={styles.grabber} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitles}>
                  <View style={styles.badgeTitleRow}>
                    <Text style={styles.sheetTitle}>Delivery Diagnostics</Text>
                    {dossier && (
                      <View
                        style={[
                          styles.statusBadge,
                          isBounced || isComplained
                            ? styles.statusBadgeError
                            : isDelivered
                            ? styles.statusBadgeSuccess
                            : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isBounced || isComplained
                              ? { color: "#f87171" }
                              : isDelivered
                              ? { color: "#34d399" }
                              : { color: "#60a5fa" },
                          ]}
                        >
                          {isBounced
                            ? "✕ Bounced"
                            : isComplained
                            ? "⚠ Spam Report"
                            : isDelivered
                            ? "✓ Delivered"
                            : "⋯ In Transit"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.recipientSub} numberOfLines={1}>
                    To: {dossier?.recipient || "Recipient"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Fetching delivery metrics...</Text>
                </View>
              ) : !dossier ? (
                <View style={styles.errorContainer}>
                  <AlertTriangle size={32} color="#f87171" />
                  <Text style={styles.errorTitle}>Telemetry Unavailable</Text>
                  <Text style={styles.errorSub}>
                    Could not retrieve delivery telemetry for this message.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Bounce / Error Alert Box if Bounced */}
                  {(isBounced || isComplained) && (
                    <View style={styles.bounceAlertCard}>
                      <View style={styles.bounceHeader}>
                        <XCircle size={18} color="#f87171" />
                        <Text style={styles.bounceTitle}>
                          {isComplained
                            ? "Spam Complaint Registered"
                            : `Delivery Failed (${dossier.deliveryBounceType || "Permanent"})`}
                        </Text>
                      </View>
                      <Text style={styles.bounceReason}>
                        {dossier.deliveryError ||
                          "The recipient mail server rejected this message."}
                      </Text>
                      <Text style={styles.bounceHint}>
                        Tip: Verify recipient address for typos or ask recipient to verify domain reputation.
                      </Text>
                    </View>
                  )}

                  {/* 4-Stat Metric Grid */}
                  <View style={styles.gridContainer}>
                    {/* Latency / Speed */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricIconRow}>
                        <Zap size={14} color="#38bdf8" />
                        <Text style={styles.metricLabel}>DELIVERY SPEED</Text>
                      </View>
                      <Text style={styles.metricValue}>
                        {dossier.deliveryLatencyFormatted || "Instant"}
                      </Text>
                      <Text style={styles.metricSub}>Round-trip to MX</Text>
                    </View>

                    {/* DMARC / SPF */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricIconRow}>
                        <ShieldCheck size={14} color="#34d399" />
                        <Text style={styles.metricLabel}>AUTH / DMARC</Text>
                      </View>
                      <Text style={[styles.metricValue, { color: "#34d399" }]}>Pass</Text>
                      <Text style={styles.metricSub} numberOfLines={1}>
                        {dossier.authAlignment.sendingDomain}
                      </Text>
                    </View>

                    {/* Reads / Opens */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricIconRow}>
                        <Eye size={14} color="#818cf8" />
                        <Text style={styles.metricLabel}>READ RECEIPTS</Text>
                      </View>
                      <Text style={styles.metricValue}>
                        {dossier.engagement.openCount > 0
                          ? `${dossier.engagement.openCount}x`
                          : "0"}
                      </Text>
                      <Text style={styles.metricSub}>
                        {dossier.engagement.openedAt
                          ? new Date(dossier.engagement.openedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Not opened yet"}
                      </Text>
                    </View>

                    {/* Link Clicks */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricIconRow}>
                        <MousePointerClick size={14} color="#fbbf24" />
                        <Text style={styles.metricLabel}>ENGAGEMENT</Text>
                      </View>
                      <Text style={styles.metricValue}>
                        {dossier.engagement.clickCount > 0
                          ? `${dossier.engagement.clickCount} Clicks`
                          : "0 Clicks"}
                      </Text>
                      <Text style={styles.metricSub}>
                        {dossier.engagement.clickCount > 0 ? "Link clicked" : "No clicks"}
                      </Text>
                    </View>
                  </View>

                  {/* Last Clicked URL Banner */}
                  {dossier.engagement.lastClickedUrl && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenLink(dossier.engagement.lastClickedUrl!)}
                      style={styles.linkCard}
                    >
                      <ExternalLink size={14} color="#60a5fa" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.linkCardLabel}>Last Clicked Link:</Text>
                        <Text style={styles.linkCardUrl} numberOfLines={1}>
                          {dossier.engagement.lastClickedUrl}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Chronological Milestone Timeline */}
                  <Text style={styles.timelineSectionTitle}>Delivery Timeline</Text>
                  <View style={styles.timelineList}>
                    {dossier.timeline.map((item, idx) => {
                      const isLast = idx === dossier.timeline.length - 1;
                      const isCurrent = item.status === "current";
                      const isFailed = item.status === "failed";
                      const isCompleted = item.status === "completed";

                      return (
                        <View key={item.id} style={styles.timelineItem}>
                          {/* Left node & connector line */}
                          <View style={styles.nodeColumn}>
                            <View
                              style={[
                                styles.timelineNode,
                                isCompleted && styles.nodeCompleted,
                                isCurrent && styles.nodeCurrent,
                                isFailed && styles.nodeFailed,
                              ]}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={12} color="#ffffff" strokeWidth={2.5} />
                              ) : isFailed ? (
                                <X size={12} color="#ffffff" strokeWidth={2.5} />
                              ) : (
                                <Clock size={10} color="#38bdf8" />
                              )}
                            </View>
                            {!isLast && <View style={styles.connectorLine} />}
                          </View>

                          {/* Right Content */}
                          <View style={styles.timelineContent}>
                            <View style={styles.timelineRow}>
                              <Text
                                style={[
                                  styles.timelineTitle,
                                  isFailed && { color: "#f87171" },
                                ]}
                              >
                                {item.title}
                              </Text>
                              {item.timestamp && (
                                <Text style={styles.timelineTime}>
                                  {new Date(item.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.timelineDesc}>{item.description}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#11131c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222538",
    maxHeight: "85%",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  grabber: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#33384c",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
  },
  badgeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  recipientSub: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeError: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusBadgePending: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#1c1f2e",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500",
  },
  errorContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  errorTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  errorSub: {
    color: "#64748b",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bounceAlertCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bounceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  bounceTitle: {
    color: "#f87171",
    fontSize: 13.5,
    fontWeight: "800",
  },
  bounceReason: {
    color: "#fca5a5",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  bounceHint: {
    color: "#cbd5e1",
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#161925",
    borderWidth: 1,
    borderColor: "#25293c",
    borderRadius: 14,
    padding: 12,
  },
  metricIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "900",
  },
  metricSub: {
    color: "#94a3b8",
    fontSize: 10.5,
    marginTop: 2,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 18,
  },
  linkCardLabel: {
    color: "#93c5fd",
    fontSize: 10.5,
    fontWeight: "700",
  },
  linkCardUrl: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  timelineSectionTitle: {
    color: "#e2e8f0",
    fontSize: 13.5,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  nodeColumn: {
    alignItems: "center",
    width: 24,
    marginRight: 12,
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1f2435",
    borderWidth: 2,
    borderColor: "#333b54",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeCompleted: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  nodeCurrent: {
    backgroundColor: "#0284c7",
    borderColor: "#38bdf8",
  },
  nodeFailed: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  connectorLine: {
    width: 2,
    flex: 1,
    height: 32,
    backgroundColor: "#22273a",
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 1,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timelineTitle: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineTime: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "600",
  },
  timelineDesc: {
    color: "#94a3b8",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
});
