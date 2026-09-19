import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import {
  Mail,
  Star,
  Trash2,
  Archive,
  AlertTriangle,
  Reply,
  ReplyAll,
  Forward,
  Clock,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Sparkles,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Message, CalendarEventData, ActionItemData } from "../types";
import { useAppTheme } from "../context/theme-context";
import { Avatar } from "./Avatar";
import { HtmlRenderer } from "./HtmlRenderer";
import { ActionItemsCard } from "./ActionItemsCard";
import { CalendarInviteCard } from "./CalendarInviteCard";
import { DeliveryDiagnosticsSheet } from "./DeliveryDiagnosticsSheet";
import { ContactDossierSheet } from "./ContactDossierSheet";
import { SnoozeSheet } from "./SnoozeSheet";
import { api } from "../api/client";

interface TabletMasterDetailProps {
  leftPane: React.ReactNode;
  selectedMessageId: string | null;
  onSelectMessage: (id: string | null) => void;
  onNavigateCompose: (params?: any) => void;
  onRefreshList?: () => void;
}

export const TabletMasterDetail: React.FC<TabletMasterDetailProps> = ({
  leftPane,
  selectedMessageId,
  onSelectMessage,
  onNavigateCompose,
  onRefreshList,
}) => {
  const { theme, isDark } = useAppTheme();

  const [message, setMessage] = useState<Message | null>(null);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEventData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);

  useEffect(() => {
    if (selectedMessageId) {
      loadMessageDetail(selectedMessageId);
    } else {
      setMessage(null);
      setCalendarEvent(null);
      setActionItems([]);
    }
  }, [selectedMessageId]);

  const loadMessageDetail = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getMessage(id);
      setMessage(data);
      if (!data.read) {
        api.markRead(id, true).catch(() => {});
      }

      // Load calendar & action items
      try {
        const calRes = await api.getCalendarDetails(id);
        setCalendarEvent(calRes.event || null);
        setActionItems(calRes.actionItems || []);
      } catch {
        setCalendarEvent(null);
        setActionItems([]);
      }
    } catch (err: any) {
      Alert.alert("Load Failed", err.message || "Could not load message.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSnooze = async (snoozeDate: Date) => {
    if (!message) return;
    try {
      await api.snoozeMessage(message.id, snoozeDate.toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSnooze(false);
      onSelectMessage(null);
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      Alert.alert("Snooze Failed", err.message || "Could not snooze message.");
    }
  };

  const handleToggleStar = async () => {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStarred = !message.starred;
    setMessage({ ...message, starred: newStarred });
    await api.toggleStar(message.id);
  };

  const handleSetStatus = async (status: "trash" | "received" | "spam" | "archived") => {
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await api.setStatus(message.id, status);
    onSelectMessage(null);
    if (onRefreshList) onRefreshList();
  };

  return (
    <View style={[styles.splitContainer, { backgroundColor: theme.background }]}>
      {/* 1. Left Master Pane (List & Controls) */}
      <View style={[styles.masterPane, { borderRightColor: theme.border }]}>
        {leftPane}
      </View>

      {/* 2. Right Detail Pane (Reader Workspace) */}
      <View style={[styles.detailPane, { backgroundColor: theme.background }]}>
        {!selectedMessageId ? (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySubtle }]}>
              <Mail size={36} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Message Selected</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Select a conversation from the left to read thread messages, inspect calendar RSVP invites, and track delivery telemetry.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onNavigateCompose()}
              style={[styles.emptyComposeBtn, { backgroundColor: theme.primary }]}
            >
              <Zap size={16} color="#ffffff" />
              <Text style={styles.emptyComposeText}>New Message (⌘N)</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : message ? (
          <View style={styles.readerContainer}>
            {/* Top Reader Action Toolbar */}
            <View style={[styles.toolbar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.toolbarLeft}>
                <TouchableOpacity
                  onPress={() => handleSetStatus("archived")}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <Archive size={17} color={theme.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetStatus("trash")}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <Trash2 size={17} color={theme.danger} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowSnooze(true)}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <Clock size={17} color={theme.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetStatus("spam")}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <AlertTriangle size={17} color={theme.warning} />
                </TouchableOpacity>
              </View>

              <View style={styles.toolbarRight}>
                <TouchableOpacity
                  onPress={() => setShowDiagnostics(true)}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <Activity size={17} color={theme.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleStar}
                  style={[styles.toolBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <Star
                    size={17}
                    color={message.starred ? "#f59e0b" : theme.textPrimary}
                    fill={message.starred ? "#f59e0b" : "transparent"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Message Body Content */}
            <ScrollView style={styles.messageScroll} contentContainerStyle={styles.messageContent}>
              {/* Subject Title */}
              <Text style={[styles.subjectTitle, { color: theme.textPrimary }]}>
                {message.subject || "(No Subject)"}
              </Text>

              {/* Sender & Contact Row */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDossier(true)}
                style={[styles.senderBox, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Avatar
                  name={message.fromContactName || message.fromAddr}
                  email={message.fromAddr}
                  size={46}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.senderName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {message.fromContactName || message.fromAddr.split("@")[0]}
                    </Text>
                    {message.spamVerdict === "spam" ? (
                      <View style={[styles.badge, { backgroundColor: theme.dangerSubtle }]}>
                        <ShieldAlert size={11} color={theme.danger} />
                        <Text style={[styles.badgeText, { color: theme.danger }]}>Spam</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: theme.successSubtle }]}>
                        <ShieldCheck size={11} color={theme.success} />
                        <Text style={[styles.badgeText, { color: theme.success }]}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.senderEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {message.fromAddr} → {message.toAddr}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Calendar RSVP Card */}
              {calendarEvent && (
                <CalendarInviteCard
                  messageId={message.id}
                  event={calendarEvent}
                  onRsvpSuccess={() => {
                    loadMessageDetail(message.id);
                  }}
                />
              )}

              {/* Action Items AI Extractor */}
              {actionItems && actionItems.length > 0 && (
                <ActionItemsCard items={actionItems} defaultSubject={message.subject || ""} />
              )}

              {/* Email Body */}
              <View style={[styles.bodyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {message.htmlBody ? (
                  <HtmlRenderer html={message.htmlBody} />
                ) : (
                  <Text style={[styles.plainTextBody, { color: theme.textPrimary }]}>
                    {message.textBody || message.snippet || ""}
                  </Text>
                )}
              </View>

              {/* Attachments Section */}
              {message.attachments && message.attachments.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                    ATTACHMENTS ({message.attachments.length})
                  </Text>
                  <View style={styles.attachmentGrid}>
                    {message.attachments.map((att) => (
                      <View
                        key={att.id}
                        style={[styles.attachmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Paperclip size={16} color={theme.primary} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.attachmentName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text style={[styles.attachmentSize, { color: theme.textMuted }]}>
                            {(att.sizeBytes / 1024).toFixed(1)} KB
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Quick Reply Toolbar */}
            <View style={[styles.bottomBar, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              <TouchableOpacity
                onPress={() =>
                  onNavigateCompose({
                    to: message.fromAddr,
                    subject: `Re: ${message.subject || ""}`,
                    inReplyTo: message.id,
                    threadId: message.threadId,
                  })
                }
                style={[styles.replyBtn, { backgroundColor: theme.primary }]}
              >
                <Reply size={15} color="#ffffff" />
                <Text style={styles.replyBtnText}>Reply</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onNavigateCompose({
                    to: `${message.fromAddr}, ${message.toAddr}`,
                    subject: `Re: ${message.subject || ""}`,
                    inReplyTo: message.id,
                    threadId: message.threadId,
                  })
                }
                style={[styles.actionBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}
              >
                <ReplyAll size={15} color={theme.textPrimary} />
                <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Reply All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onNavigateCompose({
                    subject: `Fwd: ${message.subject || ""}`,
                    text: `\n\n---------- Forwarded message ---------\nFrom: ${message.fromAddr}\nSubject: ${message.subject}\n\n${message.textBody || ""}`,
                  })
                }
                style={[styles.actionBtn, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}
              >
                <Forward size={15} color={theme.textPrimary} />
                <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>Forward</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {/* Overlays */}
      {selectedMessageId && (
        <>
          <DeliveryDiagnosticsSheet
            visible={showDiagnostics}
            onClose={() => setShowDiagnostics(false)}
            messageId={selectedMessageId}
          />
          <ContactDossierSheet
            visible={showDossier}
            onClose={() => setShowDossier(false)}
            email={message?.fromAddr || ""}
          />
          <SnoozeSheet
            visible={showSnooze}
            message={message}
            onClose={() => setShowSnooze(false)}
            onSelectSnooze={handleSelectSnooze}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  splitContainer: {
    flex: 1,
    flexDirection: "row",
  },
  masterPane: {
    width: 380,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  detailPane: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 400,
    lineHeight: 20,
  },
  emptyComposeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 22,
  },
  emptyComposeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readerContainer: {
    flex: 1,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: "row",
    gap: 8,
  },
  toolbarRight: {
    flexDirection: "row",
    gap: 8,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subjectTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  senderBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  senderName: {
    fontSize: 15,
    fontWeight: "800",
  },
  senderEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  bodyContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
  },
  plainTextBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  attachmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 200,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: "700",
  },
  attachmentSize: {
    fontSize: 10,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  replyBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
