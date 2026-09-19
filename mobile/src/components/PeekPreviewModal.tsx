import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  Reply,
  Clock,
  Star,
  MailOpen,
  Mail,
  Trash2,
  Lock,
  ShieldCheck,
  Shield,
  Paperclip,
  Maximize2,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Message } from "../types";
import { Avatar } from "./Avatar";

interface PeekPreviewModalProps {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onOpenFullThread: (message: Message) => void;
  onReply: (message: Message) => void;
  onSnooze: (message: Message) => void;
  onToggleStar: (messageId: string) => void;
  onToggleRead: (messageId: string) => void;
  onTrash: (messageId: string) => void;
}

export const PeekPreviewModal: React.FC<PeekPreviewModalProps> = ({
  visible,
  message,
  onClose,
  onOpenFullThread,
  onReply,
  onSnooze,
  onToggleStar,
  onToggleRead,
  onTrash,
}) => {
  if (!message) return null;

  const senderName =
    message.fromContactName ||
    message.fromAddr.split("<")[0].trim() ||
    message.fromAddr;
  const displayEmail = message.fromAddr.includes("<")
    ? message.fromAddr.match(/<([^>]+)>/)?.[1] || message.fromAddr
    : message.fromAddr;

  const dateStr = message.createdAt
    ? new Date(message.createdAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.previewContainer}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Avatar name={senderName} email={displayEmail} size={38} />
                <View style={styles.headerDetails}>
                  <Text style={styles.senderName} numberOfLines={1}>
                    {senderName}
                  </Text>
                  <Text style={styles.senderEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onClose}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Security & Metadata Pills */}
              <View style={styles.pillsRow}>
                <View style={styles.secPill}>
                  <Lock size={10} color="#60a5fa" />
                  <Text style={styles.secPillText}>TLS</Text>
                </View>
                <View style={styles.secPill}>
                  <ShieldCheck size={10} color="#34d399" />
                  <Text style={[styles.secPillText, { color: "#34d399" }]}>DKIM</Text>
                </View>
                {message.trackersBlockedCount && message.trackersBlockedCount > 0 ? (
                  <View style={styles.privacyPill}>
                    <Shield size={10} color="#34d399" />
                    <Text style={styles.privacyPillText}>
                      {message.trackersBlockedCount} Trackers Blocked
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.dateText}>{dateStr}</Text>
              </View>

              {/* Subject Headline */}
              <Text style={styles.subjectText} numberOfLines={2}>
                {message.subject || "(No Subject)"}
              </Text>

              {/* Message Body Peek */}
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={{ paddingVertical: 8 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.bodyText}>
                  {message.textBody || message.snippet || "No text body available."}
                </Text>
              </ScrollView>

              {/* Attachment summary if present */}
              {message.attachments && message.attachments.length > 0 && (
                <View style={styles.attRow}>
                  <Paperclip size={13} color="#94a3b8" />
                  <Text style={styles.attText}>
                    {message.attachments.length} Attachment
                    {message.attachments.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* 1-Tap Quick Action Tray */}
              <View style={styles.actionTray}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                    onReply(message);
                  }}
                  style={styles.actionBtn}
                >
                  <Reply size={16} color="#60a5fa" />
                  <Text style={styles.actionBtnText}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                    onSnooze(message);
                  }}
                  style={styles.actionBtn}
                >
                  <Clock size={16} color="#c084fc" />
                  <Text style={styles.actionBtnText}>Snooze</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleStar(message.id);
                  }}
                  style={styles.actionBtn}
                >
                  <Star
                    size={16}
                    color={message.starred ? "#f59e0b" : "#94a3b8"}
                    fill={message.starred ? "#f59e0b" : "transparent"}
                  />
                  <Text style={styles.actionBtnText}>
                    {message.starred ? "Starred" : "Star"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleRead(message.id);
                  }}
                  style={styles.actionBtn}
                >
                  {message.read ? (
                    <Mail size={16} color="#94a3b8" />
                  ) : (
                    <MailOpen size={16} color="#60a5fa" />
                  )}
                  <Text style={styles.actionBtnText}>
                    {message.read ? "Unread" : "Read"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onClose();
                    onTrash(message.id);
                  }}
                  style={[styles.actionBtn, styles.trashActionBtn]}
                >
                  <Trash2 size={16} color="#f87171" />
                  <Text style={[styles.actionBtnText, { color: "#f87171" }]}>Trash</Text>
                </TouchableOpacity>
              </View>

              {/* Open Full Thread Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onClose();
                  onOpenFullThread(message);
                }}
                style={styles.fullThreadBtn}
              >
                <Maximize2 size={14} color="#ffffff" />
                <Text style={styles.fullThreadBtnText}>Open Conversation</Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  previewContainer: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#232638",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDetails: {
    flex: 1,
    marginLeft: 10,
  },
  senderName: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "800",
  },
  senderEmail: {
    color: "#94a3b8",
    fontSize: 11.5,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#1e2130",
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    gap: 6,
  },
  secPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  secPillText: {
    color: "#93c5fd",
    fontSize: 9.5,
    fontWeight: "700",
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  privacyPillText: {
    color: "#34d399",
    fontSize: 9.5,
    fontWeight: "700",
  },
  dateText: {
    color: "#64748b",
    fontSize: 11,
    marginLeft: "auto",
  },
  subjectText: {
    color: "#f8fafc",
    fontSize: 15.5,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 10,
  },
  bodyScroll: {
    maxHeight: 180,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  bodyText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
  },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  attText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  actionTray: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trashActionBtn: {},
  actionBtnText: {
    color: "#cbd5e1",
    fontSize: 10.5,
    fontWeight: "700",
  },
  fullThreadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    gap: 6,
  },
  fullThreadBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
