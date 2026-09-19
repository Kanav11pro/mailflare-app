import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Newspaper,
  BookOpen,
  UserX,
  Star,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "../api/client";
import { Message } from "../types";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/auth-context";
import { useAppTheme } from "../context/theme-context";

export const NewsletterFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();
  const { selectedMailbox } = useAuth();
  const [newsletters, setNewsletters] = useState<Message[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  const fetchNewsletters = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.getMessages({
        folder: "inbox",
        mailboxId: selectedMailbox?.id,
        limit: 50,
      });
      // Filter for newsletters or messages containing unsubscribe headers
      const items = (data.messages || []).filter(
        (m) => m.isNewsletter || m.unsubscribeUrl || m.unsubscribeMailto
      );
      setNewsletters(items);
    } catch (err) {
      console.error("Failed to load newsletter feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMailbox]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchNewsletters(true);
  };

  const handleUnsubscribe = (msg: Message) => {
    const sender = msg.fromContactName || msg.fromAddr;
    Alert.alert(
      "1-Click Unsubscribe",
      `Automatically send an RFC 8058 unsubscription request to ${sender} and move this issue to Trash?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unsubscribe & Trash",
          style: "destructive",
          onPress: async () => {
            try {
              setUnsubscribingId(msg.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              await api.unsubscribeMessage(msg.id);
              setNewsletters((prev) => prev.filter((item) => item.id !== msg.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Unsubscribed", `You have been unsubscribed from ${sender}.`);
            } catch (err: any) {
              Alert.alert("Unsubscribe Failed", err.message || "Could not complete automated unsubscription.");
            } finally {
              setUnsubscribingId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenIssue = (msg: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("MessageDetail", {
      messageId: msg.id,
      initialMessage: msg,
    });
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Newspaper size={18} color={theme.primary} />
          <Text style={[styles.navTitle, { color: theme.textPrimary }]}>The Feed • Newsletters</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Stream */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : newsletters.length === 0 ? (
        <View style={styles.emptyBox}>
          <Newspaper size={44} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Your Feed is Clean</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            When newsletters, digests, and recurring updates arrive, Mailflare collates them here into a clean magazine reading stream.
          </Text>
        </View>
      ) : (
        <FlatList
          data={newsletters}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          contentContainerStyle={styles.streamContent}
          renderItem={({ item }) => {
            const senderName =
              item.fromContactName || item.fromAddr.split("<")[0].trim() || item.fromAddr;
            const displayEmail = item.fromAddr.includes("<")
              ? item.fromAddr.match(/<([^>]+)>/)?.[1] || item.fromAddr
              : item.fromAddr;
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "";
            const isUnsubbing = unsubscribingId === item.id;

            return (
              <View
                style={[
                  styles.magazineCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Publication Header */}
                <View style={styles.magazineHeader}>
                  <Avatar name={senderName} email={displayEmail} size={36} />
                  <View style={styles.publicationInfo}>
                    <Text
                      style={[styles.publicationName, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {senderName}
                    </Text>
                    <Text style={[styles.publicationDate, { color: theme.textMuted }]}>{dateStr}</Text>
                  </View>

                  <View style={styles.newsletterBadge}>
                    <Sparkles size={11} color="#a855f7" />
                    <Text style={styles.newsletterBadgeText}>Newsletter</Text>
                  </View>
                </View>

                {/* Big Headline */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenIssue(item)}
                >
                  <Text style={[styles.headlineTitle, { color: theme.textPrimary }]}>
                    {item.subject || "(No Subject)"}
                  </Text>
                </TouchableOpacity>

                {/* Excerpt Snippet */}
                <Text
                  style={[styles.snippetText, { color: theme.textSecondary }]}
                  numberOfLines={3}
                >
                  {item.snippet || "Tap to read full newsletter issue..."}
                </Text>

                {/* Actions Footer */}
                <View style={[styles.magazineFooter, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenIssue(item)}
                    style={[styles.readIssueBtn, { backgroundColor: theme.primary }]}
                  >
                    <BookOpen size={14} color="#ffffff" />
                    <Text style={styles.readIssueBtnText}>Read Issue</Text>
                  </TouchableOpacity>

                  {(item.unsubscribeUrl || item.unsubscribeMailto || item.isNewsletter) && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUnsubscribe(item)}
                      disabled={isUnsubbing}
                      style={styles.unsubBtn}
                    >
                      {isUnsubbing ? (
                        <ActivityIndicator size="small" color="#f87171" />
                      ) : (
                        <>
                          <UserX size={13} color="#f87171" />
                          <Text style={styles.unsubBtnText}>1-Click Unsubscribe</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  streamContent: {
    padding: 16,
    paddingBottom: 40,
  },
  magazineCard: {
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  magazineHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  publicationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  publicationName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  publicationDate: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 1,
  },
  newsletterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newsletterBadgeText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "800",
  },
  headlineTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 23,
    marginBottom: 8,
  },
  snippetText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  magazineFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  readIssueBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  readIssueBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  unsubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  unsubBtnText: {
    color: "#f87171",
    fontSize: 11,
    fontWeight: "700",
  },
});
