import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Send,
  Calendar,
  Paperclip,
  Search,
  Copy,
  UserX,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ContactDossier, Message } from "../types";
import { Avatar } from "./Avatar";
import { api } from "../api/client";

interface ContactDossierSheetProps {
  visible: boolean;
  email: string | null;
  name?: string | null;
  fallbackName?: string | null;
  onClose: () => void;
  onSearchSender?: (email: string) => void;
  onOpenMessage?: (messageId: string) => void;
  onCompose?: (email: string) => void;
}

export const ContactDossierSheet: React.FC<ContactDossierSheetProps> = ({
  visible,
  email,
  name,
  fallbackName,
  onClose,
  onSearchSender,
  onOpenMessage,
  onCompose,
}) => {
  const effectiveName = name || fallbackName;

  const [dossier, setDossier] = useState<ContactDossier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !email) {
      setDossier(null);
      return;
    }

    let isMounted = true;
    async function loadDossier() {
      setLoading(true);
      try {
        const data = await api.getContactDossier(email!);
        if (isMounted) {
          setDossier(data);
        }
      } catch (err) {
        console.error("Failed to load contact dossier:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDossier();

    return () => {
      isMounted = false;
    };
  }, [visible, email]);

  if (!email) return null;

  const displayName =
    dossier?.contact.displayName || effectiveName || email.split("@")[0];

  const handleCopyEmail = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Address Copied", email);
  };

  const handleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onSearchSender?.(`from:${email}`);
  };

  const handleCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCompose?.(email);
  };

  const handleOpenAttachment = async (attId: string, msgId: string, filename: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = api.getAttachmentUrl(msgId, attId);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Attachment", `Opening ${filename}`);
      }
    } catch {
      Alert.alert("Error", "Could not open attachment.");
    }
  };

  const trustColor =
    dossier?.stats.trustLevel === "trusted"
      ? "#34d399"
      : dossier?.stats.trustLevel === "suspicious"
      ? "#fbbf24"
      : "#f87171";

  const trustBg =
    dossier?.stats.trustLevel === "trusted"
      ? "rgba(52, 211, 153, 0.12)"
      : dossier?.stats.trustLevel === "suspicious"
      ? "rgba(251, 191, 36, 0.12)"
      : "rgba(248, 113, 113, 0.12)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sender Intelligence</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Identity Card */}
            <View style={styles.identityCard}>
              <Avatar name={displayName} email={email} size={54} />
              <View style={styles.identityDetails}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.emailText} numberOfLines={1}>
                  {email}
                </Text>

                {/* Trust Badge */}
                <View style={[styles.trustBadge, { backgroundColor: trustBg, borderColor: trustColor }]}>
                  {dossier?.stats.trustLevel === "trusted" ? (
                    <ShieldCheck size={11} color={trustColor} />
                  ) : (
                    <ShieldAlert size={11} color={trustColor} />
                  )}
                  <Text style={[styles.trustBadgeText, { color: trustColor }]}>
                    {dossier?.stats.trustLevel === "trusted"
                      ? "VERIFIED SENDER"
                      : dossier?.stats.trustLevel === "suspicious"
                      ? "SUSPICIOUS SENDER"
                      : "UNTRUSTED"}
                  </Text>
                </View>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.loadingText}>Compiling sender intelligence...</Text>
              </View>
            ) : (
              <>
                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Mail size={16} color="#60a5fa" />
                    <Text style={styles.metricValue}>
                      {dossier?.stats.totalReceived ?? 0}
                    </Text>
                    <Text style={styles.metricLabel}>Received</Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Send size={16} color="#a855f7" />
                    <Text style={styles.metricValue}>
                      {dossier?.stats.totalSent ?? 0}
                    </Text>
                    <Text style={styles.metricLabel}>Sent</Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Shield size={16} color="#34d399" />
                    <Text style={styles.metricValue}>
                      {dossier?.stats.totalTrackersBlocked ?? 0}
                    </Text>
                    <Text style={styles.metricLabel}>Trackers Blocked</Text>
                  </View>
                </View>

                {/* First / Last Contact Row */}
                <View style={styles.timelineRow}>
                  <View style={styles.timelineItem}>
                    <Calendar size={13} color="#64748b" />
                    <Text style={styles.timelineText}>
                      First:{" "}
                      {dossier?.stats.firstContactAt
                        ? new Date(dossier.stats.firstContactAt).toLocaleDateString([], {
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </Text>
                  </View>
                  <View style={styles.timelineItem}>
                    <Calendar size={13} color="#64748b" />
                    <Text style={styles.timelineText}>
                      Last:{" "}
                      {dossier?.stats.lastContactAt
                        ? new Date(dossier.stats.lastContactAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })
                        : "Today"}
                    </Text>
                  </View>
                </View>

                {/* Shared Attachments Section */}
                {dossier?.sharedAttachments && dossier.sharedAttachments.length > 0 && (
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeaderRow}>
                      <Paperclip size={14} color="#60a5fa" />
                      <Text style={styles.sectionTitle}>
                        Shared Files ({dossier.sharedAttachments.length})
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.attachmentsScroll}
                    >
                      {dossier.sharedAttachments.map((att) => (
                        <TouchableOpacity
                          key={att.id}
                          activeOpacity={0.7}
                          onPress={() => handleOpenAttachment(att.id, att.messageId, att.filename)}
                          style={styles.attachmentCard}
                        >
                          <Paperclip size={13} color="#94a3b8" />
                          <Text style={styles.attFilename} numberOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text style={styles.attSize}>
                            {(att.size / 1024).toFixed(0)} KB
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Recent Messages Section */}
                {dossier?.recentMessages && dossier.recentMessages.length > 0 && (
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Recent Conversations</Text>
                    <View style={styles.recentList}>
                      {dossier.recentMessages.map((msg) => (
                        <TouchableOpacity
                          key={msg.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            onClose();
                            onOpenMessage?.(msg.id);
                          }}
                          style={styles.recentItem}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.recentSubject} numberOfLines={1}>
                              {msg.subject}
                            </Text>
                            <Text style={styles.recentSnippet} numberOfLines={1}>
                              {msg.snippet || "No preview"}
                            </Text>
                          </View>
                          <ChevronRight size={14} color="#64748b" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Quick Action Controls */}
                <View style={styles.actionsGrid}>
                  {onCompose && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={handleCompose}
                      style={[styles.actionButton, { backgroundColor: "#2563eb", borderColor: "#3b82f6" }]}
                    >
                      <Send size={15} color="#ffffff" />
                      <Text style={[styles.actionButtonText, { color: "#ffffff" }]}>Compose</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleSearch}
                    style={styles.actionButton}
                  >
                    <Search size={15} color="#60a5fa" />
                    <Text style={styles.actionButtonText}>Find Messages</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleCopyEmail}
                    style={styles.actionButton}
                  >
                    <Copy size={15} color="#94a3b8" />
                    <Text style={[styles.actionButtonText, { color: "#cbd5e1" }]}>
                      Copy Address
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#13141d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222534",
    maxHeight: "84%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2230",
  },
  sheetTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#181a24",
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222534",
  },
  identityDetails: {
    flex: 1,
    marginLeft: 14,
  },
  nameText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  emailText: {
    color: "#94a3b8",
    fontSize: 12.5,
    marginTop: 2,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 12.5,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#181a24",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222534",
    gap: 3,
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "600",
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#181a24",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#222534",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timelineText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionBox: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  attachmentsScroll: {
    gap: 8,
  },
  attachmentCard: {
    backgroundColor: "#181a24",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222534",
    padding: 10,
    width: 130,
    gap: 4,
  },
  attFilename: {
    color: "#f8fafc",
    fontSize: 11.5,
    fontWeight: "600",
  },
  attSize: {
    color: "#64748b",
    fontSize: 10,
  },
  recentList: {
    backgroundColor: "#181a24",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222534",
    overflow: "hidden",
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  recentSubject: {
    color: "#f8fafc",
    fontSize: 12.5,
    fontWeight: "600",
  },
  recentSnippet: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 1,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#181a24",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#222534",
  },
  actionButtonText: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "700",
  },
});
