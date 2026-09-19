import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  Inbox,
  Search,
  MailCheck,
  X,
  Trash2,
  MailOpen,
  Mail,
  Star,
  CheckCheck,
  AlertTriangle,
  Send,
  Filter,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/auth-context";
import { api } from "../api/client";
import { Message } from "../types";
import { EmailRow } from "../components/EmailRow";
import { SkeletonList } from "../components/SkeletonLoader";
import { Header } from "../components/Header";
import { MailboxSheet } from "../components/MailboxSheet";
import { SnoozeSheet } from "../components/SnoozeSheet";
import { ContactDossierSheet } from "../components/ContactDossierSheet";
import { PeekPreviewModal } from "../components/PeekPreviewModal";
import { OutboxCard } from "../components/OutboxCard";
import { SearchFilterSheet } from "../components/SearchFilterSheet";
import { TabletMasterDetail } from "../components/TabletMasterDetail";
import { getCachedMessages, setCachedMessages } from "../lib/cache";
import { registerForPushNotifications } from "../lib/notifications";
import { OutboxItem, getOutboxItems, removeOutboxItem } from "../lib/outbox";
import { SyncManager } from "../lib/sync-manager";
import { exportWidgetSnapshot } from "../lib/widget-bridge";
import { useAppTheme } from "../context/theme-context";

export const InboxScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    mailboxes,
    selectedMailbox,
    selectedFolder,
    setSelectedMailbox,
    setSelectedFolder,
  } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedTabletMessageId, setSelectedTabletMessageId] = useState<string | null>(null);
  const [snoozeTargetMessage, setSnoozeTargetMessage] = useState<Message | null>(null);
  const [previewTargetMessage, setPreviewTargetMessage] = useState<Message | null>(null);
  const [dossierTarget, setDossierTarget] = useState<{ email: string; name?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const isSelectionMode = selectedMessageIds.size > 0;


  // Listen for Outbox changes
  useEffect(() => {
    const unsub = SyncManager.subscribe((items) => {
      setOutboxItems(items);
    });
    return unsub;
  }, []);

  const fetchMessages = useCallback(async (isRefresh = false) => {
    if (selectedFolder === "outbox") {
      const items = await getOutboxItems();
      setOutboxItems(items);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Attempt instant 0ms offline cache load first if not searching
    if (!isRefresh && !searchQuery.trim()) {
      try {
        const cached = await getCachedMessages(selectedFolder, selectedMailbox?.id);
        if (cached && cached.length > 0) {
          setMessages(cached);
          setLoading(false);
        }
      } catch {}
    }

    if (!isRefresh && messages.length === 0) setLoading(true);

    try {
      const data = await api.getMessages({
        folder: selectedFolder,
        mailboxId: selectedMailbox ? selectedMailbox.id : undefined,
        query: searchQuery.trim() || undefined,
        limit: 50,
      });
      const fresh = data.messages || [];
      setMessages(fresh);

      // Update offline cache & widget snapshot silently
      if (!searchQuery.trim()) {
        setCachedMessages(selectedFolder, selectedMailbox?.id, fresh);
        exportWidgetSnapshot({
          messages: fresh,
          outboxCount: outboxItems.length,
          accountEmail: selectedMailbox
            ? `${selectedMailbox.localPart}@${selectedMailbox.hostname}`
            : undefined,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFolder, selectedMailbox, searchQuery, messages.length]);

  useEffect(() => {
    fetchMessages();
    registerForPushNotifications().catch(() => {});
    SyncManager.flushSyncQueue().catch(() => {});

    const unsubscribe = navigation.addListener("focus", () => {
      fetchMessages(true);
      SyncManager.flushSyncQueue().catch(() => {});
    });
    return unsubscribe;
  }, [fetchMessages, navigation]);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (selectedFolder === "outbox") {
      setIsSyncingOutbox(true);
      await SyncManager.flushSyncQueue(true);
      setIsSyncingOutbox(false);
      setRefreshing(false);
    } else {
      await fetchMessages(true);
      SyncManager.flushSyncQueue().catch(() => {});
    }
  };

  const handleRetryOutbox = async (id?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncingOutbox(true);
    await SyncManager.flushSyncQueue(true);
    setIsSyncingOutbox(false);
  };

  const handleDeleteOutbox = async (id: string) => {
    await removeOutboxItem(id);
    await SyncManager.notifyListeners();
  };

  const handleToggleStar = async (messageId: string) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, starred: !msg.starred } : msg
      )
    );
    try {
      await api.toggleStar(messageId);
    } catch (err) {
      console.error("Star toggle error:", err);
      // Revert if error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, starred: !msg.starred } : msg
        )
      );
    }
  };

  // Snooze message handler
  const handleSelectSnooze = async (snoozeDate: Date) => {
    if (!snoozeTargetMessage) return;
    const msgId = snoozeTargetMessage.id;
    const target = snoozeTargetMessage;

    // Optimistically remove from active inbox view if currently in inbox
    if (selectedFolder === "inbox") {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
    setSnoozeTargetMessage(null);

    try {
      await api.snoozeMessage(msgId, snoozeDate.toISOString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Snooze failed:", err);
      if (selectedFolder === "inbox") {
        setMessages((prev) => [target, ...prev]);
      }
      Alert.alert("Snooze Failed", "Could not schedule message snooze.");
    }
  };

  // Swipe Left -> Move to Trash
  const handleSwipeLeft = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    // Optimistic delete from list
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await api.bulkAction("trash", [messageId]);
    } catch (err) {
      console.error("Swipe trash error:", err);
      // Restore on failure
      setMessages((prev) => [target, ...prev]);
    }
  };

  // Swipe Right -> Toggle Read/Unread
  const handleSwipeRight = async (messageId: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target) return;

    const newRead = !target.read;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: newRead } : m))
    );
    try {
      await api.markRead(messageId, newRead);
    } catch (err) {
      console.error("Swipe read error:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, read: target.read } : m))
      );
    }
  };

  // Selection Mode Handlers
  const handleSelectToggle = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(messages.map((m) => m.id)));
    }
  };

  const handleCancelSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessageIds(new Set());
  };

  const handleLongPressSelect = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: "read" | "unread" | "trash" | "spam" | "star") => {
    const ids = Array.from(selectedMessageIds);
    if (ids.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMessageIds(new Set());

    if (action === "trash") {
      setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      try {
        await api.bulkAction("trash", ids);
      } catch (err) {
        console.error("Bulk trash failed:", err);
        fetchMessages(true);
      }
    } else if (action === "read") {
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m))
      );
      try {
        await api.bulkAction("read", ids);
      } catch (err) {
        console.error("Bulk read failed:", err);
        fetchMessages(true);
      }
    } else if (action === "unread") {
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, read: false } : m))
      );
      try {
        await api.bulkAction("unread", ids);
      } catch (err) {
        console.error("Bulk unread failed:", err);
        fetchMessages(true);
      }
    } else if (action === "spam") {
      setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      try {
        await api.bulkAction("spam", ids);
      } catch (err) {
        console.error("Bulk spam failed:", err);
        fetchMessages(true);
      }
    } else if (action === "star") {
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, starred: true } : m))
      );
      try {
        await Promise.all(ids.map((id) => api.toggleStar(id)));
      } catch (err) {
        console.error("Bulk star failed:", err);
        fetchMessages(true);
      }
    }
  };

  const handleMessagePress = (message: Message) => {
    if (isSelectionMode) {
      handleSelectToggle(message.id);
      return;
    }

    if (!message.read) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, read: true } : m))
      );
      api.markRead(message.id, true).catch(() => {});
    }

    // If opening a draft, launch composer directly
    if (selectedFolder === "drafts") {
      navigation.navigate("Compose", {
        to: message.toAddr,
        subject: message.subject || "",
        text: message.textBody || message.snippet || "",
      });
      return;
    }

    if (isTablet) {
      setSelectedTabletMessageId(message.id);
    } else {
      navigation.navigate("MessageDetail", { messageId: message.id, initialMessage: message });
    }
  };

  const handleOpenCompose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Compose");
  };

  const folderTitle =
    selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1);

  const allSelected = messages.length > 0 && selectedMessageIds.size === messages.length;

  const renderMessageListContent = () => (
    <>
      {/* Top Header OR Multi-Select Bulk Action Bar */}
      {isSelectionMode ? (
        <View
          style={[
            styles.bulkActionBar,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.bulkLeft}>
            <TouchableOpacity
              onPress={handleCancelSelection}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.bulkCloseBtn}
            >
              <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.bulkCountText, { color: theme.textPrimary }]}>
              {selectedMessageIds.size} Selected
            </Text>
          </View>

          <View style={styles.bulkActionsRow}>
            {/* Select All Toggle */}
            <TouchableOpacity
              onPress={handleSelectAll}
              style={[
                styles.bulkIconBtn,
                { backgroundColor: theme.cardSubtle, borderColor: theme.border },
                allSelected && styles.bulkIconBtnActive,
              ]}
            >
              <CheckCheck size={18} color={allSelected ? theme.primary : theme.textMuted} />
            </TouchableOpacity>

            {/* Mark as Read */}
            <TouchableOpacity
              onPress={() => handleBulkAction("read")}
              style={[
                styles.bulkIconBtn,
                { backgroundColor: theme.cardSubtle, borderColor: theme.border },
              ]}
            >
              <MailOpen size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Mark as Unread */}
            <TouchableOpacity
              onPress={() => handleBulkAction("unread")}
              style={[
                styles.bulkIconBtn,
                { backgroundColor: theme.cardSubtle, borderColor: theme.border },
              ]}
            >
              <Mail size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Star */}
            <TouchableOpacity
              onPress={() => handleBulkAction("star")}
              style={[
                styles.bulkIconBtn,
                { backgroundColor: theme.cardSubtle, borderColor: theme.border },
              ]}
            >
              <Star size={18} color="#f59e0b" />
            </TouchableOpacity>

            {/* Spam */}
            <TouchableOpacity
              onPress={() => handleBulkAction("spam")}
              style={[
                styles.bulkIconBtn,
                { backgroundColor: theme.cardSubtle, borderColor: theme.border },
              ]}
            >
              <AlertTriangle size={18} color="#fbbf24" />
            </TouchableOpacity>

            {/* Trash */}
            <TouchableOpacity
              onPress={() => handleBulkAction("trash")}
              style={[styles.bulkIconBtn, styles.bulkTrashBtn]}
            >
              <Trash2 size={18} color="#f87171" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenFilter={() => setFilterSheetVisible(true)}
          onOpenSheet={() => setSheetVisible(true)}
          onOpenSettings={() => navigation.navigate("Settings")}
          onOpenMaskedAliases={() => navigation.navigate("MaskedAliases")}
          onOpenNewsletterFeed={() => navigation.navigate("NewsletterFeed")}
        />
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        {selectedFolder === "outbox" ? (
          outboxItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Send size={32} color="#38bdf8" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Outbox is Clear</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                No messages waiting to send. Any email composed while offline will appear here and deliver automatically when connection returns.
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, padding: 16 }}>
              {/* Outbox Sync Bar */}
              <View
                style={[
                  styles.outboxSyncBar,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Send size={14} color="#38bdf8" />
                  <Text style={[styles.outboxSyncTitle, { color: theme.textPrimary }]}>
                    {outboxItems.length} Message{outboxItems.length > 1 ? "s" : ""} in Outbox
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isSyncingOutbox}
                  onPress={() => handleRetryOutbox()}
                  style={styles.syncAllBtn}
                >
                  <Text style={styles.syncAllBtnText}>
                    {isSyncingOutbox ? "Syncing..." : "Send All Now"}
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={outboxItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <OutboxCard
                    item={item}
                    onRetry={handleRetryOutbox}
                    onDelete={handleDeleteOutbox}
                    isRetrying={isSyncingOutbox}
                  />
                )}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#38bdf8"
                    colors={["#38bdf8"]}
                  />
                }
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            </View>
          )
        ) : loading && !refreshing ? (
          <SkeletonList count={8} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {searchQuery ? (
                <Search size={32} color={theme.primary} />
              ) : selectedFolder === "inbox" ? (
                <MailCheck size={32} color="#34d399" />
              ) : (
                <Inbox size={32} color={theme.primary} />
              )}
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery
                ? "No matching messages"
                : selectedFolder === "inbox"
                ? "Your Inbox is clear"
                : `No ${folderTitle} messages`}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              {searchQuery
                ? "Try checking your query or filter by another folder or mailbox."
                : selectedFolder === "inbox"
                ? "Your inbox is clear. New messages routed via Cloudflare will appear here instantly."
                : `No messages in ${folderTitle.toLowerCase()} folder.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EmailRow
                message={item}
                onPress={() => handleMessagePress(item)}
                onToggleStar={handleToggleStar}
                onToggleRead={handleSwipeRight}
                onSnooze={(msg) => setSnoozeTargetMessage(msg)}
                onTrash={handleSwipeLeft}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onPressAvatar={(email, name) => setDossierTarget({ email, name })}
                isSelectionMode={isSelectionMode}
                isSelected={selectedMessageIds.has(item.id) || (isTablet && selectedTabletMessageId === item.id)}
                onSelectToggle={handleSelectToggle}
                onLongPress={handleLongPressSelect}
                onPreview={(msg) => setPreviewTargetMessage(msg)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Floating Gradient Compose Action Button (hidden in selection mode) */}
        {!isSelectionMode && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenCompose}
            style={[styles.fab, { backgroundColor: theme.primary }]}
          >
            <Plus size={20} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.fabText}>Compose</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      {isTablet ? (
        <TabletMasterDetail
          leftPane={renderMessageListContent()}
          selectedMessageId={selectedTabletMessageId}
          onSelectMessage={setSelectedTabletMessageId}
          onNavigateCompose={(params) => navigation.navigate("Compose", params)}
          onRefreshList={() => fetchMessages(true)}
        />
      ) : (
        renderMessageListContent()
      )}

      {/* Visual Search Filter Sheet */}
      <SearchFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        currentQuery={searchQuery}
        onApplyQuery={(q) => setSearchQuery(q)}
      />


      {/* Bottom Sheet for Folder/Mailbox Selection */}
      <MailboxSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        mailboxes={mailboxes}
        selectedMailbox={selectedMailbox}
        selectedFolder={selectedFolder}
        onSelectMailbox={setSelectedMailbox}
        onSelectFolder={setSelectedFolder}
      />

      {/* Contextual Snooze Picker Bottom Sheet */}
      <SnoozeSheet
        visible={!!snoozeTargetMessage}
        message={snoozeTargetMessage}
        onClose={() => setSnoozeTargetMessage(null)}
        onSelectSnooze={handleSelectSnooze}
      />

      {/* Native Peek-and-Pop Context Preview Modal */}
      <PeekPreviewModal
        visible={!!previewTargetMessage}
        message={previewTargetMessage}
        onClose={() => setPreviewTargetMessage(null)}
        onOpenFullThread={(msg) => {
          setPreviewTargetMessage(null);
          navigation.navigate("MessageDetail", { messageId: msg.id, initialMessage: msg });
        }}
        onReply={(msg) => {
          setPreviewTargetMessage(null);
          navigation.navigate("Compose", { replyToMessage: msg });
        }}
        onSnooze={(msg) => {
          setPreviewTargetMessage(null);
          setSnoozeTargetMessage(msg);
        }}
        onToggleStar={(id) => handleToggleStar(id)}
        onToggleRead={(id) => handleSwipeRight(id)}
        onTrash={(id) => handleSwipeLeft(id)}
      />

      {/* Contact Intelligence Dossier (Contact 360) */}
      <ContactDossierSheet
        visible={!!dossierTarget}
        email={dossierTarget?.email ?? null}
        fallbackName={dossierTarget?.name}
        onClose={() => setDossierTarget(null)}
        onSearchSender={(q) => setSearchQuery(q)}
        onOpenMessage={(msgId) => {
          setDossierTarget(null);
          navigation.navigate("MessageDetail", { messageId: msgId });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0c10",
  },
  bulkActionBar: {
    backgroundColor: "#13141d",
    borderBottomWidth: 1,
    borderBottomColor: "#222534",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bulkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bulkCloseBtn: {
    padding: 4,
  },
  bulkCountText: {
    color: "#f8fafc",
    fontSize: 14.5,
    fontWeight: "800",
  },
  bulkActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulkIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1c1e2a",
    borderWidth: 1,
    borderColor: "#282a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  bulkIconBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "#3b82f6",
  },
  bulkTrashBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  content: {
    flex: 1,
  },
  outboxSyncBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#151722",
    borderWidth: 1,
    borderColor: "#232638",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  outboxSyncTitle: {
    color: "#e2e8f0",
    fontSize: 12.5,
    fontWeight: "700",
  },
  syncAllBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncAllBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 96,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  fabText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
