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
  Inbox,
  Star,
  Send,
  Trash2,
  AlertTriangle,
  Mail,
  Check,
  X,
  FileText,
  Shield,
  Zap,
  Clock,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { FolderType, Mailbox } from "../types";
import { useAuth } from "../context/auth-context";
import { Avatar } from "./Avatar";
import { useAppTheme } from "../context/theme-context";

interface MailboxSheetProps {
  visible: boolean;
  onClose: () => void;
  mailboxes: Mailbox[];
  selectedMailbox: Mailbox | null;
  selectedFolder: FolderType;
  onSelectMailbox: (mailbox: Mailbox | null) => void;
  onSelectFolder: (folder: FolderType) => void;
}

const FOLDERS: { id: FolderType; label: string; icon: any; color?: string }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star, color: "#f59e0b" },
  { id: "snoozed", label: "Snoozed", icon: Clock, color: "#a855f7" },
  { id: "outbox", label: "Outbox", icon: Send, color: "#38bdf8" },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "spam", label: "Spam", icon: AlertTriangle, color: "#f87171" },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export const MailboxSheet: React.FC<MailboxSheetProps> = ({
  visible,
  onClose,
  mailboxes,
  selectedMailbox,
  selectedFolder,
  onSelectMailbox,
  onSelectFolder,
}) => {
  const { user } = useAuth();
  const { theme, isDark } = useAppTheme();

  const handleFolderSelect = (folder: FolderType) => {
    Haptics.selectionAsync();
    onSelectFolder(folder);
    onClose();
  };

  const handleMailboxSelect = (mailbox: Mailbox | null) => {
    Haptics.selectionAsync();
    onSelectMailbox(mailbox);
    onClose();
  };

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
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
                ]}
              />

              {/* Account Identity Header */}
              <View
                style={[
                  styles.accountHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <Avatar
                  name={user?.name}
                  email={user?.email || "user@mailflare.app"}
                  size={42}
                />
                <View style={styles.accountDetails}>
                  <Text style={[styles.accountName, { color: theme.textPrimary }]}>
                    {user?.name || "Mailflare User"}
                  </Text>
                  <Text style={[styles.accountEmail, { color: theme.textMuted }]}>
                    {user?.email}
                  </Text>
                </View>
                <View style={styles.edgeTag}>
                  <Zap size={11} color="#60a5fa" />
                  <Text style={styles.edgeTagText}>Cloudflare</Text>
                </View>
              </View>

              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Folders Section */}
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>FOLDERS</Text>
                <View
                  style={[
                    styles.cardSection,
                    {
                      backgroundColor: theme.cardSubtle,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {FOLDERS.map((folder, index) => {
                    const IconComponent = folder.icon;
                    const isSelected = selectedFolder === folder.id;
                    const isLast = index === FOLDERS.length - 1;

                    return (
                      <TouchableOpacity
                        key={folder.id}
                        activeOpacity={0.7}
                        onPress={() => handleFolderSelect(folder.id)}
                        style={[
                          styles.rowItem,
                          isSelected && {
                            backgroundColor: isDark
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(59, 130, 246, 0.08)",
                          },
                          !isLast && [styles.rowDivider, { borderBottomColor: theme.border }],
                        ]}
                      >
                        <View style={styles.rowLeft}>
                          <IconComponent
                            size={18}
                            color={isSelected ? theme.primary : folder.color || theme.textMuted}
                            fill={folder.id === "starred" && isSelected ? "#f59e0b" : "transparent"}
                          />
                          <Text
                            style={[
                              styles.rowText,
                              {
                                color: isSelected ? theme.primary : theme.textPrimary,
                                fontWeight: isSelected ? "800" : "600",
                              },
                            ]}
                          >
                            {folder.label}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color={theme.primary} strokeWidth={2.5} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Mailboxes Section */}
                {mailboxes.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 22 }]}>
                      MAILBOX IDENTITIES ({mailboxes.length})
                    </Text>
                    <View
                      style={[
                        styles.cardSection,
                        {
                          backgroundColor: theme.cardSubtle,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleMailboxSelect(null)}
                        style={[
                          styles.rowItem,
                          selectedMailbox === null && {
                            backgroundColor: isDark
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(59, 130, 246, 0.08)",
                          },
                          [styles.rowDivider, { borderBottomColor: theme.border }],
                        ]}
                      >
                        <View style={styles.rowLeft}>
                          <Mail
                            size={18}
                            color={selectedMailbox === null ? theme.primary : theme.textMuted}
                          />
                          <Text
                            style={[
                              styles.rowText,
                              {
                                color: selectedMailbox === null ? theme.primary : theme.textPrimary,
                                fontWeight: selectedMailbox === null ? "800" : "600",
                              },
                            ]}
                          >
                            All Inboxes
                          </Text>
                        </View>
                        {selectedMailbox === null && (
                          <Check size={16} color={theme.primary} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>

                      {mailboxes.map((mb, idx) => {
                        const isSelected = selectedMailbox?.id === mb.id;
                        const isLast = idx === mailboxes.length - 1;
                        const address = `${mb.localPart}@${mb.hostname || "domain"}`;

                        return (
                          <TouchableOpacity
                            key={mb.id}
                            activeOpacity={0.7}
                            onPress={() => handleMailboxSelect(mb)}
                            style={[
                              styles.rowItem,
                              isSelected && {
                                backgroundColor: isDark
                                  ? "rgba(59, 130, 246, 0.12)"
                                  : "rgba(59, 130, 246, 0.08)",
                              },
                              !isLast && [styles.rowDivider, { borderBottomColor: theme.border }],
                            ]}
                          >
                            <View style={styles.rowLeft}>
                              <Avatar name={mb.displayName || mb.localPart} email={address} size={28} />
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text
                                    style={[
                                      styles.rowText,
                                      {
                                        color: isSelected ? theme.primary : theme.textPrimary,
                                        fontWeight: isSelected ? "800" : "600",
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {mb.displayName || mb.localPart}
                                  </Text>
                                  {mb.isPrimary && (
                                    <View style={styles.primaryBadge}>
                                      <Text style={styles.primaryBadgeText}>Primary</Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={[styles.mailboxSubtext, { color: theme.textMuted }]}
                                  numberOfLines={1}
                                >
                                  {address}
                                </Text>
                              </View>
                            </View>
                            {isSelected && <Check size={16} color={theme.primary} strokeWidth={2.5} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </ScrollView>
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#13141d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#222534",
    maxHeight: "82%",
    paddingBottom: 36,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  accountEmail: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 1,
  },
  edgeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  edgeTagText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cardSection: {
    backgroundColor: "#181a24",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#232636",
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  rowText: {
    fontSize: 14,
  },
  rowTextNormal: {
    color: "#cbd5e1",
    fontWeight: "600",
  },
  rowTextSelected: {
    color: "#60a5fa",
    fontWeight: "800",
  },
  mailboxSubtext: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  primaryBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: "#93c5fd",
    fontSize: 9,
    fontWeight: "700",
  },
});
