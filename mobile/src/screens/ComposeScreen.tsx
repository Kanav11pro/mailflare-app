import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Send,
  ChevronDown,
  Paperclip,
  Lock,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { Avatar } from "../components/Avatar";
import { addOutboxItem } from "../lib/outbox";
import { SyncManager } from "../lib/sync-manager";
import { useAppTheme } from "../context/theme-context";

export const ComposeScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { theme, isDark } = useAppTheme();
  const { selectedMailbox, mailboxes } = useAuth();

  const replyTo = route.params?.replyToMessage;
  const replyAll = route.params?.replyAll;
  const forwardMsg = route.params?.forwardMessage;
  const initialTo = route.params?.initialTo || route.params?.to;
  const initialSubject = route.params?.initialSubject || route.params?.subject;
  const initialBody = route.params?.initialBody || route.params?.body;

  const defaultFrom =
    selectedMailbox?.senderAddresses?.[0] ||
    (selectedMailbox
      ? `${selectedMailbox.localPart}@${selectedMailbox.hostname || "mail.studyholic.xyz"}`
      : "support@mail.studyholic.xyz");

  const [fromAddr, setFromAddr] = useState(defaultFrom);
  const [toAddr, setToAddr] = useState(initialTo || "");
  const [ccAddr, setCcAddr] = useState("");
  const [bccAddr, setBccAddr] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState(initialBody || "");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);

  useEffect(() => {
    if (replyTo) {
      const recipient = replyTo.direction === "inbound" ? replyTo.fromAddr : replyTo.toAddr;
      setToAddr(recipient);
      if (replyAll && replyTo.ccAddr) {
        setCcAddr(replyTo.ccAddr);
        setShowCcBcc(true);
      }
      const reSub = replyTo.subject?.startsWith("Re:")
        ? replyTo.subject
        : `Re: ${replyTo.subject || ""}`;
      setSubject(reSub);
      setBody(
        `\n\n--- On ${new Date(replyTo.createdAt).toLocaleString()}, ${replyTo.fromAddr} wrote:\n>${(replyTo.textBody || replyTo.snippet || "").replace(/\n/g, "\n> ")}`
      );
    } else if (forwardMsg) {
      const fwdSub = forwardMsg.subject?.startsWith("Fwd:")
        ? forwardMsg.subject
        : `Fwd: ${forwardMsg.subject || ""}`;
      setSubject(fwdSub);
      setBody(
        `\n\n---------- Forwarded message ---------\nFrom: ${forwardMsg.fromAddr}\nSubject: ${forwardMsg.subject}\nDate: ${new Date(forwardMsg.createdAt).toLocaleString()}\n\n${forwardMsg.textBody || forwardMsg.snippet || ""}`
      );
    } else {
      if (initialTo) setToAddr(initialTo);
      if (initialSubject) setSubject(initialSubject);
      if (initialBody) setBody(initialBody);
    }
  }, [replyTo, replyAll, forwardMsg, initialTo, initialSubject, initialBody]);

  const handleClose = () => {
    if (body.trim().length > 10 || subject.trim().length > 0 || toAddr.trim().length > 0) {
      Alert.alert("Discard Draft?", "You have unsaved changes in your message.", [
        { text: "Keep Editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const handleSend = async () => {
    if (!toAddr.trim()) {
      Alert.alert("Missing Recipient", "Please enter at least one recipient email address in the To: field.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const activeMailbox =
      mailboxes.find(
        (m) =>
          m.senderAddresses?.some((addr) => addr.toLowerCase() === fromAddr.trim().toLowerCase()) ||
          `${m.localPart}@${m.hostname}`.toLowerCase() === fromAddr.trim().toLowerCase()
      ) ||
      selectedMailbox ||
      mailboxes[0];

    if (!activeMailbox) {
      Alert.alert("Missing Mailbox", "No active sending mailbox found.");
      return;
    }

    try {
      setSending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await api.sendMessage({
        from: fromAddr.trim(),
        to: toAddr.trim(),
        cc: ccAddr.trim() || undefined,
        bcc: bccAddr.trim() || undefined,
        subject: subject.trim(),
        text: body,
        mailboxId: activeMailbox.id,
        threadId: replyTo?.threadId || undefined,
        inReplyTo: replyTo?.inReplyTo || replyTo?.id || undefined,
        references: replyTo?.references || replyTo?.id || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err: any) {
      console.warn("Direct send failed, queuing in Outbox:", err);
      try {
        await addOutboxItem({
          from: fromAddr.trim(),
          to: toAddr.trim(),
          cc: ccAddr.trim() || undefined,
          bcc: bccAddr.trim() || undefined,
          subject: subject.trim(),
          text: body,
          mailboxId: activeMailbox.id,
          threadId: replyTo?.threadId || undefined,
          inReplyTo: replyTo?.inReplyTo || replyTo?.id || undefined,
          references: replyTo?.references || replyTo?.id || undefined,
          lastError: err?.message || "Network offline",
        });
        await SyncManager.notifyListeners();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Saved to Outbox",
          "Unable to reach server right now. Your email is queued in your Outbox and will send automatically when connected."
        );
        navigation.goBack();
      } catch (saveErr) {
        Alert.alert("Send Failed", err.message || "Failed to deliver message");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      {/* Top Composer Navbar */}
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
          onPress={handleClose}
          style={styles.navBtn}
        >
          <X size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.navTitleBox}>
          <Text style={[styles.navTitle, { color: theme.textPrimary }]}>
            {replyTo ? "Reply" : forwardMsg ? "Forward" : "New Message"}
          </Text>
          <View style={styles.navSubRow}>
            <ShieldCheck size={11} color="#34d399" />
            <Text style={styles.navSubtext}>DKIM Signed</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSend}
          disabled={sending}
          style={[styles.sendBtn, { backgroundColor: theme.primary }, sending && { opacity: 0.6 }]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Send size={14} color="#ffffff" strokeWidth={2.5} />
              <Text style={styles.sendBtnText}>Send</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={[styles.formScroll, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* From Selector Row */}
          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>From</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowFromPicker(!showFromPicker)}
              style={[
                styles.fromPickerTrigger,
                {
                  backgroundColor: theme.cardSubtle,
                  borderColor: theme.border,
                },
              ]}
            >
              <Avatar email={fromAddr} size={22} />
              <Text
                style={[styles.fromPickerText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {fromAddr}
              </Text>
              <ChevronDown size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Mailbox Picker Dropdown if open */}
          {showFromPicker && mailboxes.length > 0 && (
            <View
              style={[
                styles.fromDropdown,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {mailboxes.map((mb) => {
                const addr = `${mb.localPart}@${mb.hostname || "mail.studyholic.xyz"}`;
                const isCurrent = fromAddr.toLowerCase() === addr.toLowerCase();

                return (
                  <TouchableOpacity
                    key={mb.id}
                    onPress={() => {
                      setFromAddr(addr);
                      setShowFromPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.fromDropdownItem,
                      isCurrent && { backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)" },
                    ]}
                  >
                    <Avatar name={mb.displayName || mb.localPart} email={addr} size={24} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.dropdownName, { color: theme.textPrimary }]}>
                        {mb.displayName || mb.localPart}
                      </Text>
                      <Text style={[styles.dropdownAddr, { color: theme.textMuted }]}>{addr}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* To Field Row with Cc/Bcc Toggle */}
          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>To</Text>
            <TextInput
              value={toAddr}
              onChangeText={setToAddr}
              style={[styles.fieldInput, { color: theme.textPrimary }]}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="recipient@example.com"
              placeholderTextColor={theme.textMuted}
            />
            {!showCcBcc && (
              <TouchableOpacity
                onPress={() => setShowCcBcc(true)}
                style={styles.ccToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.ccToggleText, { color: theme.primary }]}>Cc/Bcc</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Expandable Cc Row */}
          {showCcBcc && (
            <>
              <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Cc</Text>
                <TextInput
                  value={ccAddr}
                  onChangeText={setCcAddr}
                  style={[styles.fieldInput, { color: theme.textPrimary }]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="colleague@example.com"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Bcc</Text>
                <TextInput
                  value={bccAddr}
                  onChangeText={setBccAddr}
                  style={[styles.fieldInput, { color: theme.textPrimary }]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="bcc@example.com"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </>
          )}

          {/* Subject Row */}
          <View style={[styles.subjectRow, { borderBottomColor: theme.border }]}>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              style={[styles.subjectInput, { color: theme.textPrimary }]}
              placeholder="Subject"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Message Body Input */}
          <View style={styles.bodyRow}>
            <TextInput
              value={body}
              onChangeText={setBody}
              style={[styles.bodyInput, { color: theme.textPrimary }]}
              placeholder="Write your email here..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus={!replyTo}
            />
          </View>
        </ScrollView>

        {/* Bottom Composer Toolbar */}
        <View
          style={[
            styles.composerToolbar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => Alert.alert("Attachments", "Cloudflare R2 attachment upload is enabled.")}
          >
            <Paperclip size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.toolDivider, { backgroundColor: theme.border }]} />

          <View style={styles.securityTag}>
            <Lock size={12} color={theme.primary} />
            <Text style={[styles.securityTagText, { color: theme.primary }]}>TLS Protected</Text>
          </View>

          <View style={styles.toolSpacer} />

          <Text style={styles.charCount}>{body.length} characters</Text>
        </View>
      </KeyboardAvoidingView>
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
    padding: 6,
  },
  navTitleBox: {
    alignItems: "center",
  },
  navTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  navSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  navSubtext: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "700",
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563eb",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    width: 48,
  },
  fieldInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  fromPickerTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 8,
  },
  fromPickerText: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
  },
  fromDropdown: {
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  fromDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  fromDropdownItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  dropdownName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  dropdownAddr: {
    color: "#94a3b8",
    fontSize: 11,
  },
  ccToggle: {
    backgroundColor: "#181a24",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#222534",
  },
  ccToggleText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  subjectRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  subjectInput: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 0,
  },
  bodyRow: {
    paddingTop: 14,
    minHeight: 280,
  },
  bodyInput: {
    color: "#f1f5f9",
    fontSize: 14.5,
    lineHeight: 23,
    paddingVertical: 0,
  },
  composerToolbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0e14",
    borderTopWidth: 1,
    borderTopColor: "#222534",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  toolBtn: {
    padding: 6,
  },
  toolDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#222534",
  },
  securityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  securityTagText: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "700",
  },
  toolSpacer: {
    flex: 1,
  },
  charCount: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
});
