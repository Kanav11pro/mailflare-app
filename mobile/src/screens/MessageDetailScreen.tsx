import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Star,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Send,
  X,
  Sparkles,
  Layers,
  Shield,
  UserX,
  Clock,
  Zap,
  Eye,
  MousePointerClick,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "../api/client";
import { Message, Attachment } from "../types";
import { Avatar } from "../components/Avatar";
import { HtmlRenderer } from "../components/HtmlRenderer";
import { SnoozeSheet } from "../components/SnoozeSheet";
import { ContactDossierSheet } from "../components/ContactDossierSheet";
import { CalendarInviteCard } from "../components/CalendarInviteCard";
import { ActionItemsCard } from "../components/ActionItemsCard";
import { DeliveryDiagnosticsSheet } from "../components/DeliveryDiagnosticsSheet";
import { CalendarDetailsResponse } from "../types";
import { useAuth } from "../context/auth-context";
import { useAppTheme } from "../context/theme-context";

export const MessageDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { theme, isDark } = useAppTheme();
  const { messageId, initialMessage } = route.params;
  const { selectedMailbox, mailboxes } = useAuth();


  const [targetMessage, setTargetMessage] = useState<Message | null>(initialMessage || null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(
    new Set([messageId])
  );
  const [loading, setLoading] = useState(!initialMessage?.textBody && !initialMessage?.htmlBody);
  const [isStarred, setIsStarred] = useState(initialMessage?.starred || false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [dossierTarget, setDossierTarget] = useState<{ email: string; name?: string } | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDetailsResponse | null>(null);
  const [deliveryDiagnosticsOpen, setDeliveryDiagnosticsOpen] = useState(false);
  const [showFullDetailsMap, setShowFullDetailsMap] = useState<Record<string, boolean>>({});
  const [viewModeMap, setViewModeMap] = useState<Record<string, "html" | "text">>({});

  // Inline quick reply state
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const [quickReplySending, setQuickReplySending] = useState(false);

  // Image preview modal state
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  useEffect(() => {
    async function loadThreadAndMessage() {
      try {
        const [fullMsg, thread, calRes] = await Promise.all([
          api.getMessage(messageId),
          api.getThread(messageId).catch(() => []),
          api.getCalendarDetails(messageId).catch(() => null),
        ]);

        setTargetMessage(fullMsg);
        setIsStarred(fullMsg.starred);
        if (calRes) setCalendarData(calRes);

        if (thread.length > 1) {
          setThreadMessages(thread);
          // Expand the newest message by default
          const newestMsg = thread[thread.length - 1];
          setExpandedMessageIds(new Set([newestMsg.id, fullMsg.id]));
        } else {
          setThreadMessages([fullMsg]);
          setExpandedMessageIds(new Set([fullMsg.id]));
        }
      } catch (err) {
        console.error("Failed to load thread:", err);
      } finally {
        setLoading(false);
      }
    }
    loadThreadAndMessage();
  }, [messageId]);

  const activeMessage =
    threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : targetMessage;

  const handleToggleStar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isStarred;
    setIsStarred(next);
    try {
      await api.toggleStar(messageId);
    } catch {
      setIsStarred(!next);
    }
  };

  const handleDelete = () => {
    Alert.alert("Move to Trash", "Are you sure you want to move this conversation to Trash?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Trash",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          try {
            const idsToDelete =
              threadMessages.length > 0
                ? threadMessages.map((m) => m.id)
                : [messageId];
            await api.bulkAction("trash", idsToDelete);
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete message");
          }
        },
      },
    ]);
  };

  const handleSelectSnooze = async (snoozeDate: Date) => {
    const msg = activeMessage || targetMessage;
    if (!msg) return;
    try {
      await api.snoozeMessage(msg.id, snoozeDate.toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSnoozeOpen(false);
      Alert.alert("Snoozed", "Email snoozed until scheduled time.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Snooze Failed", err.message || "Failed to snooze message");
    }
  };

  const toggleExpand = (msgId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleReply = (isAll = false, target?: Message) => {
    const msgToReply = target || activeMessage;
    if (!msgToReply) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Compose", {
      replyToMessage: msgToReply,
      replyAll: isAll,
    });
  };

  const handleForward = (target?: Message) => {
    const msgToForward = target || activeMessage;
    if (!msgToForward) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Compose", {
      forwardMessage: msgToForward,
    });
  };

  const handleSendQuickReply = async () => {
    if (!quickReplyText.trim() || !activeMessage) return;

    const recipient =
      activeMessage.direction === "inbound" ? activeMessage.fromAddr : activeMessage.toAddr;
    const fromAddr =
      selectedMailbox?.senderAddresses?.[0] ||
      (selectedMailbox
        ? `${selectedMailbox.localPart}@${selectedMailbox.hostname || "mail.studyholic.xyz"}`
        : "support@mail.studyholic.xyz");

    const activeMailbox =
      mailboxes.find(
        (m) =>
          m.senderAddresses?.some((addr) => addr.toLowerCase() === fromAddr.trim().toLowerCase()) ||
          `${m.localPart}@${m.hostname}`.toLowerCase() === fromAddr.trim().toLowerCase()
      ) ||
      selectedMailbox ||
      mailboxes[0];

    if (!activeMailbox) {
      Alert.alert("Missing Mailbox", "No active mailbox available to send reply.");
      return;
    }

    try {
      setQuickReplySending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const reSubject = activeMessage.subject?.startsWith("Re:")
        ? activeMessage.subject
        : `Re: ${activeMessage.subject || ""}`;

      await api.sendMessage({
        from: fromAddr.trim(),
        to: recipient.trim(),
        subject: reSubject,
        text: quickReplyText.trim(),
        mailboxId: activeMailbox.id,
        threadId: activeMessage.threadId || undefined,
        inReplyTo: activeMessage.inReplyTo || activeMessage.id || undefined,
        references: activeMessage.references || activeMessage.id || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setQuickReplyText("");
      setQuickReplyOpen(false);
      Alert.alert("Sent", "Your reply has been delivered.");
    } catch (err: any) {
      Alert.alert("Send Failed", err.message || "Failed to send reply");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setQuickReplySending(false);
    }
  };

  const handleAttachmentPress = async (msgId: string, att: Attachment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = api.getAttachmentUrl(msgId, att.id);

    if (att.contentType?.startsWith("image/")) {
      setPreviewImageUri(url);
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Attachment", `Opening ${att.filename}`);
      }
    } catch {
      Alert.alert("Error", "Unable to open attachment link.");
    }
  };

  const handleUnsubscribe = (msgId: string) => {
    Alert.alert(
      "1-Click Unsubscribe",
      "Send an RFC 8058 automated unsubscription request and move this email to Trash?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unsubscribe & Trash",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await api.unsubscribeMessage(msgId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Unsubscribed", "Unsubscription request delivered. Message moved to Trash.");
              navigation.goBack();
            } catch (err: any) {
              Alert.alert("Unsubscribe Failed", err.message || "Could not complete automated unsubscription.");
            }
          },
        },
      ]
    );
  };

  const senderName =
    activeMessage?.fromContactName ||
    activeMessage?.fromAddr.split("<")[0].trim() ||
    activeMessage?.fromAddr ||
    "";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Top Navbar */}
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

        {/* Thread Badge if Conversation */}
        {threadMessages.length > 1 && (
          <View style={[styles.threadBadge, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
            <Layers size={13} color={theme.primary} />
            <Text style={[styles.threadBadgeText, { color: theme.primary }]}>
              {threadMessages.length} Messages in Thread
            </Text>
          </View>
        )}

        <View style={styles.navActions}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setSnoozeOpen(true)}
            style={styles.navBtn}
          >
            <Clock size={20} color="#a855f7" />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleToggleStar}
            style={styles.navBtn}
          >
            <Star
              size={20}
              color={isStarred ? "#f59e0b" : theme.textMuted}
              fill={isStarred ? "#f59e0b" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleDelete}
            style={styles.navBtn}
          >
            <Trash2 size={20} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Conversation Headline */}
          <Text style={[styles.subjectTitle, { color: theme.textPrimary }]}>
            {activeMessage?.subject || "(No Subject)"}
          </Text>

          {/* Outbound Delivery Intelligence Card (Sent Mail) */}
          {activeMessage?.direction === "outbound" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDeliveryDiagnosticsOpen(true);
              }}
              style={styles.deliveryStatusCard}
            >
              <View style={styles.deliveryStatusLeft}>
                <View
                  style={[
                    styles.deliveryStatusIconBox,
                    activeMessage.deliveryStatus === "bounced"
                      ? styles.deliveryStatusIconBoxError
                      : (activeMessage.openCount ?? 0) > 0
                      ? styles.deliveryStatusIconBoxOpened
                      : styles.deliveryStatusIconBoxSuccess,
                  ]}
                >
                  {activeMessage.deliveryStatus === "bounced" ? (
                    <AlertTriangle size={15} color="#f87171" />
                  ) : (activeMessage.openCount ?? 0) > 0 ? (
                    <Eye size={15} color="#818cf8" />
                  ) : (
                    <Zap size={15} color="#34d399" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.deliveryStatusHeading}>
                      {activeMessage.deliveryStatus === "bounced"
                        ? "Delivery Bounced"
                        : (activeMessage.openCount ?? 0) > 0
                        ? `Opened ${activeMessage.openCount}x by recipient`
                        : activeMessage.deliveryLatencyMs
                        ? `Delivered in ${Math.round(activeMessage.deliveryLatencyMs)}ms`
                        : "Delivered via Resend"}
                    </Text>
                  </View>
                  <Text style={styles.deliveryStatusSub} numberOfLines={1}>
                    {activeMessage.deliveryStatus === "bounced"
                      ? activeMessage.deliveryError || "Recipient mailbox rejected message"
                      : "Apex DMARC aligned • Tap for telemetry timeline"}
                  </Text>
                </View>
              </View>

              <View style={styles.viewDiagnosticsPill}>
                <Text style={styles.viewDiagnosticsPillText}>Diagnostics</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Spam warning banner if flagged */}
          {activeMessage?.spamVerdict === "spam" && (
            <View style={styles.spamBanner}>
              <AlertTriangle size={18} color="#f87171" />
              <View style={{ flex: 1 }}>
                <Text style={styles.spamBannerTitle}>Flagged as Spam by Heuristics</Text>
                <Text style={styles.spamBannerDesc}>
                  This email scored {activeMessage.spamScore ?? 100}/100 on spam analyzers.
                </Text>
              </View>
            </View>
          )}

          {/* Calendar Invite Card (if .ics payload attached) */}
          {calendarData?.event && (
            <CalendarInviteCard
              messageId={messageId}
              event={calendarData.event}
              onRsvpSuccess={(action) => {
                setCalendarData((prev) =>
                  prev && prev.event
                    ? {
                        ...prev,
                        event: {
                          ...prev.event,
                          userStatus:
                            action === "accept"
                              ? "ACCEPTED"
                              : action === "decline"
                              ? "DECLINED"
                              : "TENTATIVE",
                        },
                      }
                    : prev
                );
              }}
            />
          )}

          {/* Action Items / Suggested Meeting Detection Banner */}
          {calendarData?.actionItems && calendarData.actionItems.length > 0 && !calendarData?.event && (
            <ActionItemsCard
              items={calendarData.actionItems}
              defaultSubject={activeMessage?.subject || undefined}
            />
          )}

          {/* Messages in Thread (Accordion) */}
          {(threadMessages.length > 0 ? threadMessages : targetMessage ? [targetMessage] : []).map(
            (msg, idx) => {
              const isExpanded = expandedMessageIds.has(msg.id);
              const msgSenderName =
                msg.fromContactName ||
                msg.fromAddr.split("<")[0].trim() ||
                msg.fromAddr;
              const msgDisplayEmail = msg.fromAddr.includes("<")
                ? msg.fromAddr.match(/<([^>]+)>/)?.[1] || msg.fromAddr
                : msg.fromAddr;
              const msgDate = msg.createdAt
                ? new Date(msg.createdAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const msgHasHtml = !!msg.htmlBody;
              const msgViewMode = viewModeMap[msg.id] || (msgHasHtml ? "html" : "text");
              const showDetails = !!showFullDetailsMap[msg.id];

              if (!isExpanded) {
                // Collapsed Accordion Row
                return (
                  <TouchableOpacity
                    key={msg.id}
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(msg.id)}
                    style={[
                      styles.collapsedCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setDossierTarget({ email: msgDisplayEmail, name: msgSenderName });
                      }}
                    >
                      <Avatar name={msgSenderName} email={msgDisplayEmail} size={34} />
                    </TouchableOpacity>
                    <View style={styles.collapsedDetails}>
                      <View style={styles.collapsedHeaderRow}>
                        <Text
                          style={[styles.collapsedSenderText, { color: theme.textPrimary }]}
                          numberOfLines={1}
                        >
                          {msgSenderName}
                        </Text>
                        <Text style={[styles.collapsedDateText, { color: theme.textMuted }]}>{msgDate}</Text>
                      </View>
                      <Text
                        style={[styles.collapsedSnippet, { color: theme.textMuted }]}
                        numberOfLines={1}
                      >
                        {msg.snippet || "(No preview text)"}
                      </Text>
                    </View>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <Paperclip size={13} color={theme.textMuted} style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              }

              // Expanded Full Message Card
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.expandedMessageCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {/* Sender & Trust Header */}
                  <View style={styles.senderHeaderRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        setDossierTarget({ email: msgDisplayEmail, name: msgSenderName })
                      }
                    >
                      <Avatar name={msgSenderName} email={msgDisplayEmail} size={42} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() =>
                        setDossierTarget({ email: msgDisplayEmail, name: msgSenderName })
                      }
                      style={styles.senderDetails}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text
                          style={[styles.senderNameText, { color: theme.textPrimary }]}
                          numberOfLines={1}
                        >
                          {msgSenderName}
                        </Text>
                        <Text style={[styles.dateText, { color: theme.textMuted }]}>{msgDate}</Text>
                      </View>
                      <Text
                        style={[styles.senderEmailText, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {msgDisplayEmail}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Security Chips + HTML/Text Pill */}
                  <View style={[styles.securityChipsRow, { borderTopColor: theme.border }]}>
                    <View style={styles.securityChip}>
                      <Lock size={11} color="#60a5fa" />
                      <Text style={styles.securityChipText}>TLS</Text>
                    </View>
                    <View style={styles.securityChip}>
                      <ShieldCheck size={11} color="#34d399" />
                      <Text style={[styles.securityChipText, { color: "#34d399" }]}>DKIM</Text>
                    </View>

                    {/* Privacy Shield Chip */}
                    {msg.trackersBlockedCount && msg.trackersBlockedCount > 0 ? (
                      <View style={styles.privacyShieldChip}>
                        <Shield size={11} color="#34d399" />
                        <Text style={styles.privacyShieldChipText}>
                          {msg.trackersBlockedCount} Trackers Blocked
                        </Text>
                      </View>
                    ) : null}

                    {/* 1-Click Unsubscribe Chip */}
                    {(msg.unsubscribeUrl || msg.unsubscribeMailto || msg.isNewsletter) && (
                      <TouchableOpacity
                        onPress={() => handleUnsubscribe(msg.id)}
                        style={styles.unsubChip}
                      >
                        <UserX size={11} color="#f87171" />
                        <Text style={styles.unsubChipText}>Unsubscribe</Text>
                      </TouchableOpacity>
                    )}

                    {/* HTML / Text toggle */}
                    {msgHasHtml && (
                      <View style={[styles.viewModePill, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                        <TouchableOpacity
                          onPress={() => {
                            setViewModeMap((p) => ({ ...p, [msg.id]: "html" }));
                            Haptics.selectionAsync();
                          }}
                          style={[styles.modeBtn, msgViewMode === "html" && styles.modeBtnActive]}
                        >
                          <Text
                            style={[
                              styles.modeBtnText,
                              msgViewMode === "html" && styles.modeBtnTextActive,
                            ]}
                          >
                            HTML
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setViewModeMap((p) => ({ ...p, [msg.id]: "text" }));
                            Haptics.selectionAsync();
                          }}
                          style={[styles.modeBtn, msgViewMode === "text" && styles.modeBtnActive]}
                        >
                          <Text
                            style={[
                              styles.modeBtnText,
                              msgViewMode === "text" && styles.modeBtnTextActive,
                            ]}
                          >
                            Text
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() =>
                        setShowFullDetailsMap((p) => ({ ...p, [msg.id]: !p[msg.id] }))
                      }
                      style={styles.detailsToggle}
                    >
                      <Text style={[styles.detailsToggleText, { color: theme.textMuted }]}>
                        {showDetails ? "Hide" : "Details"}
                      </Text>
                      {showDetails ? (
                        <ChevronUp size={12} color={theme.textMuted} />
                      ) : (
                        <ChevronDown size={12} color={theme.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Expandable Header Details Tray */}
                  {showDetails && (
                    <View style={[styles.expandedDetails, { borderTopColor: theme.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>From:</Text>
                        <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{msg.fromAddr}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>To:</Text>
                        <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{msg.toAddr}</Text>
                      </View>
                      {msg.ccAddr && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Cc:</Text>
                          <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{msg.ccAddr}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Date:</Text>
                        <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{msgDate}</Text>
                      </View>
                    </View>
                  )}

                  {/* Body Content */}
                  <View style={[styles.bodyCard, { borderTopColor: theme.border }]}>
                    {msgViewMode === "html" && msg.htmlBody ? (
                      <HtmlRenderer html={msg.htmlBody} />
                    ) : (
                      <Text style={[styles.bodyText, { color: theme.textPrimary }]} selectable>
                        {msg.textBody || msg.snippet || "No text body available."}
                      </Text>
                    )}
                  </View>

                  {/* Attachments Section */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <View style={[styles.attachmentSection, { borderTopColor: theme.border }]}>
                      <View style={styles.attachmentSectionHeader}>
                        <Paperclip size={14} color={theme.textMuted} />
                        <Text style={[styles.attachmentSectionTitle, { color: theme.textMuted }]}>
                          ATTACHMENTS ({msg.attachments.length})
                        </Text>
                      </View>

                      {msg.attachments.map((att) => {
                        const isImage = att.contentType?.startsWith("image/");
                        const sizeKb = (att.sizeBytes / 1024).toFixed(1);

                        return (
                          <TouchableOpacity
                            key={att.id}
                            activeOpacity={0.75}
                            onPress={() => handleAttachmentPress(msg.id, att)}
                            style={[
                              styles.attachmentCard,
                              {
                                backgroundColor: theme.cardSubtle,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <View style={[styles.attachmentIconBox, { backgroundColor: theme.card }]}>
                              {isImage ? (
                                <ImageIcon size={18} color="#a855f7" />
                              ) : (
                                <FileText size={18} color={theme.primary} />
                              )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[styles.attachmentFilename, { color: theme.textPrimary }]}
                                numberOfLines={1}
                              >
                                {att.filename}
                              </Text>
                              <Text style={[styles.attachmentSize, { color: theme.textMuted }]}>
                                {att.contentType || "file"} • {sizeKb} KB
                              </Text>
                            </View>
                            <View style={styles.downloadPill}>
                              <Text style={styles.downloadPillText}>
                                {isImage ? "View" : "Open"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            }
          )}
        </ScrollView>
      )}

      {/* Inline Quick Reply Drawer / Toolbar */}
      {quickReplyOpen ? (
        <View
          style={[
            styles.quickReplyContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.quickReplyHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color={theme.primary} />
              <Text style={[styles.quickReplyTitle, { color: theme.textPrimary }]}>
                Quick Reply to {senderName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setQuickReplyOpen(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={quickReplyText}
            onChangeText={setQuickReplyText}
            placeholder="Type your quick reply..."
            placeholderTextColor={theme.textMuted}
            multiline
            autoFocus
            style={[
              styles.quickReplyInput,
              {
                backgroundColor: theme.cardSubtle,
                borderColor: theme.border,
                color: theme.textPrimary,
              },
            ]}
          />
          <View style={styles.quickReplyActions}>
            <TouchableOpacity
              onPress={() => handleReply(false)}
              style={styles.expandReplyBtn}
            >
              <Text style={[styles.expandReplyText, { color: theme.textSecondary }]}>
                Full Composer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSendQuickReply}
              disabled={quickReplySending || !quickReplyText.trim()}
              style={[
                styles.sendReplyBtn,
                { backgroundColor: theme.primary },
                (!quickReplyText.trim() || quickReplySending) && { opacity: 0.5 },
              ]}
            >
              {quickReplySending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={13} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.sendReplyText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.footerToolbar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
            },
          ]}
        >
          {/* Quick Reply Trigger Box */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuickReplyOpen(true);
            }}
            style={[
              styles.quickReplyTrigger,
              {
                backgroundColor: theme.cardSubtle,
                borderColor: theme.border,
              },
            ]}
          >
            <Reply size={15} color={theme.primary} />
            <Text style={[styles.quickReplyTriggerText, { color: theme.textMuted }]}>
              Quick reply to {senderName}...
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleReply(false)}
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.cardSubtle,
                borderColor: theme.border,
              },
            ]}
          >
            <Reply size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleReply(true)}
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.cardSubtle,
                borderColor: theme.border,
              },
            ]}
          >
            <ReplyAll size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleForward()}
            style={[
              styles.iconActionBtn,
              {
                backgroundColor: theme.cardSubtle,
                borderColor: theme.border,
              },
            ]}
          >
            <Forward size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={previewImageUri !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={styles.imageModalBackdrop}>
          <TouchableOpacity
            onPress={() => setPreviewImageUri(null)}
            style={styles.closeImageModal}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewImageUri && (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.fullModalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Contextual Snooze Picker Bottom Sheet */}
      <SnoozeSheet
        visible={snoozeOpen}
        message={activeMessage || targetMessage}
        onClose={() => setSnoozeOpen(false)}
        onSelectSnooze={handleSelectSnooze}
      />

      {/* Contact Intelligence Dossier */}
      <ContactDossierSheet
        visible={!!dossierTarget}
        email={dossierTarget?.email ?? null}
        fallbackName={dossierTarget?.name}
        onClose={() => setDossierTarget(null)}
        onSearchSender={(q) => {
          setDossierTarget(null);
          navigation.navigate("Inbox");
        }}
        onOpenMessage={(msgId) => {
          setDossierTarget(null);
          if (msgId !== messageId) {
            navigation.navigate("MessageDetail", { messageId: msgId });
          }
        }}
      />

      {/* Outbound Delivery Diagnostics Bottom Sheet */}
      <DeliveryDiagnosticsSheet
        visible={deliveryDiagnosticsOpen}
        messageId={activeMessage?.id || messageId}
        onClose={() => setDeliveryDiagnosticsOpen(false)}
      />
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
  threadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  threadBadgeText: {
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: "700",
  },
  viewModePill: {
    flexDirection: "row",
    backgroundColor: "#13141d",
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
    borderColor: "#222534",
    marginLeft: "auto",
    marginRight: 6,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: "#2563eb",
  },
  modeBtnText: {
    color: "#94a3b8",
    fontSize: 10.5,
    fontWeight: "700",
  },
  modeBtnTextActive: {
    color: "#ffffff",
  },
  navActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0b0c10",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subjectTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 27,
    marginBottom: 14,
  },
  spamBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  spamBannerTitle: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "700",
  },
  spamBannerDesc: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  collapsedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#11131c",
    borderWidth: 1,
    borderColor: "#1e2130",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  collapsedDetails: {
    flex: 1,
    marginLeft: 10,
  },
  collapsedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  collapsedSenderText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  collapsedDateText: {
    color: "#64748b",
    fontSize: 10.5,
  },
  collapsedSnippet: {
    color: "#64748b",
    fontSize: 12,
  },
  expandedMessageCard: {
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  senderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  senderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  senderNameText: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  senderEmailText: {
    color: "#94a3b8",
    fontSize: 11.5,
    marginTop: 1,
  },
  dateText: {
    color: "#64748b",
    fontSize: 11,
  },
  securityChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    gap: 6,
  },
  securityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  securityChipText: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "700",
  },
  privacyShieldChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  privacyShieldChipText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "700",
  },
  unsubChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  unsubChipText: {
    color: "#f87171",
    fontSize: 10,
    fontWeight: "700",
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 2,
  },
  detailsToggleText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  expandedDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    gap: 5,
  },
  detailRow: {
    flexDirection: "row",
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 11.5,
    width: 44,
    fontWeight: "600",
  },
  detailValue: {
    color: "#cbd5e1",
    fontSize: 11.5,
    flex: 1,
  },
  bodyCard: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    minHeight: 80,
  },
  bodyText: {
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
  },
  attachmentSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  attachmentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  attachmentSectionTitle: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  attachmentIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#202330",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentFilename: {
    color: "#f8fafc",
    fontSize: 12.5,
    fontWeight: "700",
  },
  attachmentSize: {
    color: "#64748b",
    fontSize: 10.5,
    marginTop: 1,
  },
  downloadPill: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  downloadPillText: {
    color: "#60a5fa",
    fontSize: 10.5,
    fontWeight: "700",
  },
  footerToolbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0e14",
    borderTopWidth: 1,
    borderTopColor: "#222534",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickReplyTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  quickReplyTriggerText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    alignItems: "center",
    justifyContent: "center",
  },
  quickReplyContainer: {
    backgroundColor: "#13141d",
    borderTopWidth: 1,
    borderTopColor: "#222534",
    padding: 16,
    gap: 10,
  },
  quickReplyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickReplyTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  quickReplyInput: {
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    borderRadius: 12,
    padding: 12,
    color: "#f8fafc",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  quickReplyActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandReplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  expandReplyText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  sendReplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendReplyText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeImageModal: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 8,
    borderRadius: 20,
  },
  fullModalImage: {
    width: "90%",
    height: "80%",
  },
  deliveryStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#131520",
    borderWidth: 1,
    borderColor: "#22273a",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  deliveryStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  deliveryStatusIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryStatusIconBoxSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  deliveryStatusIconBoxOpened: {
    backgroundColor: "rgba(129, 140, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.3)",
  },
  deliveryStatusIconBoxError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  deliveryStatusHeading: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  deliveryStatusSub: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 1,
  },
  viewDiagnosticsPill: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewDiagnosticsPillText: {
    color: "#60a5fa",
    fontSize: 10.5,
    fontWeight: "800",
  },
});
