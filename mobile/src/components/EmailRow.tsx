import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Star,
  Paperclip,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  MailOpen,
  Mail,
  Check,
  Clock,
  Shield,
  Eye,
  MousePointerClick,
  Zap,
} from "lucide-react-native";
import { Message } from "../types";
import { Avatar } from "./Avatar";
import { useAppTheme } from "../context/theme-context";

export interface EmailRowProps {
  message: Message;
  onPress: () => void;
  onToggleStar: (id: string) => void;
  onToggleRead?: (id: string) => void;
  onSnooze?: (message: Message) => void;
  onTrash?: (id: string) => void;
  onSwipeLeft?: (id: string) => void;
  onSwipeRight?: (id: string) => void;
  onPressAvatar?: (email: string, name?: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  onLongPress?: (id: string) => void;
  onPreview?: (message: Message) => void;
}

function formatDate(dateValue: string | number | Date): string {
  try {
    const d = new Date(dateValue);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return "Yesterday";
    }

    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" });
  } catch {
    return "";
  }
}

export const EmailRow: React.FC<EmailRowProps> = ({
  message,
  onPress,
  onToggleStar,
  onToggleRead,
  onSnooze,
  onTrash,
  onSwipeLeft,
  onSwipeRight,
  onPressAvatar,
  isSelectionMode = false,
  isSelected = false,
  onSelectToggle,
  onLongPress,
  onPreview,
}) => {
  const { theme, isDark } = useAppTheme();
  const isUnread = !message.read;
  const isStarred = message.starred;
  const senderDisplayName =
    message.fromContactName || message.fromAddr.split("<")[0].trim() || message.fromAddr;
  const displayEmail = message.fromAddr.includes("<")
    ? message.fromAddr.match(/<([^>]+)>/)?.[1] || message.fromAddr
    : message.fromAddr;

  const translateX = useRef(new Animated.Value(0)).current;
  const [swipeZone, setSwipeZone] = useState<"idle" | "read" | "star" | "snooze" | "trash">("idle");
  const lastZoneRef = useRef<"idle" | "read" | "star" | "snooze" | "trash">("idle");

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isSelectionMode) return false;
        // Only capture horizontal gestures
        return Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 14;
      },
      onPanResponderGrant: () => {
        lastZoneRef.current = "idle";
        setSwipeZone("idle");
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.max(-170, Math.min(170, gestureState.dx));
        translateX.setValue(dx);

        let currentZone: "idle" | "read" | "star" | "snooze" | "trash" = "idle";
        if (dx > 110) {
          currentZone = "star";
        } else if (dx > 40) {
          currentZone = "read";
        } else if (dx < -110) {
          currentZone = "trash";
        } else if (dx < -40) {
          currentZone = "snooze";
        }

        if (currentZone !== lastZoneRef.current) {
          if (currentZone !== "idle") {
            Haptics.impactAsync(
              currentZone === "star" || currentZone === "trash"
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light
            );
          }
          lastZoneRef.current = currentZone;
          setSwipeZone(currentZone);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalZone = lastZoneRef.current;
        setSwipeZone("idle");
        lastZoneRef.current = "idle";

        if (finalZone === "trash") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onTrash) onTrash(message.id);
            else onSwipeLeft?.(message.id);
            translateX.setValue(0);
          });
        } else if (finalZone === "snooze") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          onSnooze?.(message);
        } else if (finalZone === "star") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          onToggleStar(message.id);
        } else if (finalZone === "read") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          if (onToggleRead) onToggleRead(message.id);
          else onSwipeRight?.(message.id);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        setSwipeZone("idle");
        lastZoneRef.current = "idle";
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleRowPress = () => {
    if (isSelectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectToggle?.(message.id);
    } else {
      onPress();
    }
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSelectionMode) {
      onSelectToggle?.(message.id);
    } else if (onPreview) {
      onPreview(message);
    } else {
      onLongPress?.(message.id);
    }
  };

  const handleAvatarLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSelectionMode) {
      onSelectToggle?.(message.id);
    } else {
      onLongPress?.(message.id);
    }
  };

  const handleStarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleStar(message.id);
  };

  const cardBg = isSelected
    ? isDark
      ? "#151b2e"
      : "#eff6ff"
    : isUnread
    ? isDark
      ? theme.cardSubtle
      : "#ffffff"
    : isDark
    ? theme.card
    : "#f8fafc";

  const senderTextColor = isUnread ? theme.textPrimary : theme.textSecondary;
  const subjectTextColor = isUnread ? theme.textPrimary : theme.textMuted;
  const timeTextColor = isUnread ? theme.primary : theme.textMuted;
  const borderColor = theme.border;

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      {/* Dynamic Multi-Threshold Background Actions */}
      <View style={styles.backgroundActionsContainer}>
        {/* Left Side (Swipe Right: Read OR Star) */}
        <View
          style={[
            styles.leftActionReveal,
            swipeZone === "star"
              ? { backgroundColor: "#ca8a04" }
              : { backgroundColor: "#2563eb" },
          ]}
        >
          {swipeZone === "star" ? (
            <>
              <Star size={22} color="#ffffff" fill="#ffffff" />
              <Text style={styles.actionText}>{isStarred ? "Unstar" : "Star"}</Text>
            </>
          ) : isUnread ? (
            <>
              <MailOpen size={22} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.actionText}>Read</Text>
            </>
          ) : (
            <>
              <Mail size={22} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.actionText}>Unread</Text>
            </>
          )}
        </View>

        {/* Right Side (Swipe Left: Snooze OR Trash) */}
        <View
          style={[
            styles.rightActionReveal,
            swipeZone === "trash"
              ? { backgroundColor: "#dc2626" }
              : { backgroundColor: "#7e22ce" },
          ]}
        >
          {swipeZone === "trash" ? (
            <>
              <Trash2 size={22} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.actionText}>Trash</Text>
            </>
          ) : (
            <>
              <Clock size={22} color="#ffffff" strokeWidth={2.2} />
              <Text style={styles.actionText}>Snooze</Text>
            </>
          )}
        </View>
      </View>

      {/* Foreground Swipeable Card */}
      <Animated.View
        style={[
          styles.animatedCard,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleRowPress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          style={[
            styles.container,
            {
              backgroundColor: cardBg,
              borderBottomColor: borderColor,
            },
            isSelected && {
              borderLeftWidth: 3.5,
              borderLeftColor: theme.primary,
            },
          ]}
        >
          {/* Left Glowing Accent Bar for Unread */}
          {!isSelectionMode && isUnread && (
            <View style={[styles.unreadAccentBar, { backgroundColor: theme.primary }]} />
          )}

          {/* Selection Checkbox OR Avatar Column */}
          {isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectToggle?.(message.id);
              }}
              style={styles.checkboxCol}
            >
              <View
                style={[
                  styles.checkboxCircle,
                  isSelected
                    ? [styles.checkboxChecked, { backgroundColor: theme.primary, borderColor: theme.primary }]
                    : [styles.checkboxUnchecked, { borderColor: theme.border }],
                ]}
              >
                {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPressAvatar?.(displayEmail, senderDisplayName);
              }}
              onLongPress={handleAvatarLongPress}
              style={styles.avatarCol}
            >
              <Avatar name={senderDisplayName} email={displayEmail} size={40} />
            </TouchableOpacity>
          )}

          {/* Main Content Column */}
          <View style={styles.contentCol}>
            {/* Top Header: Sender Name + Timestamp */}
            <View style={styles.headerRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.senderText,
                  { color: senderTextColor },
                  isUnread && styles.senderUnreadWeight,
                ]}
              >
                {senderDisplayName}
              </Text>
              <Text
                style={[
                  styles.timeText,
                  { color: timeTextColor },
                  isUnread && styles.timeUnreadWeight,
                ]}
              >
                {formatDate(message.createdAt)}
              </Text>
            </View>

            {/* Subject */}
            <Text
              numberOfLines={1}
              style={[
                styles.subjectText,
                { color: subjectTextColor },
                isUnread && styles.subjectUnreadWeight,
              ]}
            >
              {message.subject || "(No Subject)"}
            </Text>

            {/* Snippet */}
            <Text numberOfLines={2} style={[styles.snippetText, { color: theme.textMuted }]}>
              {message.snippet || "No preview available"}
            </Text>

            {/* Bottom Badge Row */}
            <View style={styles.badgesRow}>
              {message.spamVerdict === "spam" && (
                <View style={styles.spamBadge}>
                  <AlertTriangle size={10} color="#f87171" />
                  <Text style={styles.spamBadgeText}>Spam</Text>
                </View>
              )}

              {message.spamVerdict === "suspicious" && (
                <View style={styles.suspiciousBadge}>
                  <AlertTriangle size={10} color="#fbbf24" />
                  <Text style={styles.suspiciousBadgeText}>Suspicious</Text>
                </View>
              )}

              {message.attachments && message.attachments.length > 0 && (
                <View style={[styles.attachmentBadge, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                  <Paperclip size={10} color={theme.textMuted} />
                  <Text style={[styles.attachmentBadgeText, { color: theme.textSecondary }]}>
                    {message.attachments.length} {message.attachments.length === 1 ? "file" : "files"}
                  </Text>
                </View>
              )}

              {message.threadCount && message.threadCount > 1 && (
                <View style={[styles.threadBadge, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                  <Text style={[styles.threadBadgeText, { color: theme.textSecondary }]}>{message.threadCount} msgs</Text>
                </View>
              )}

              {message.direction === "inbound" && message.spamVerdict === "inbox" && (
                <View style={styles.verifiedBadge}>
                  <ShieldCheck size={10} color="#34d399" />
                  <Text style={styles.verifiedBadgeText}>DKIM</Text>
                </View>
              )}

              {/* Outbound Delivery Diagnostics Badges */}
              {message.direction === "outbound" && message.deliveryStatus === "bounced" && (
                <View style={styles.deliveryBouncedBadge}>
                  <AlertTriangle size={9.5} color="#f87171" />
                  <Text style={styles.deliveryBouncedText}>Bounced</Text>
                </View>
              )}

              {message.direction === "outbound" && (message.clickCount ?? 0) > 0 && (
                <View style={styles.deliveryClickedBadge}>
                  <MousePointerClick size={9.5} color="#fbbf24" />
                  <Text style={styles.deliveryClickedText}>{message.clickCount} Clicks</Text>
                </View>
              )}

              {message.direction === "outbound" && (message.openCount ?? 0) > 0 && (
                <View style={styles.deliveryOpenedBadge}>
                  <Eye size={9.5} color="#818cf8" />
                  <Text style={styles.deliveryOpenedText}>{message.openCount}x Opened</Text>
                </View>
              )}

              {message.direction === "outbound" &&
                message.deliveryStatus !== "bounced" &&
                (message.openCount ?? 0) === 0 &&
                (message.clickCount ?? 0) === 0 && (
                  <View style={styles.deliverySuccessBadge}>
                    <Check size={9.5} color="#34d399" strokeWidth={3} />
                    <Text style={styles.deliverySuccessText}>
                      {message.deliveryLatencyMs
                        ? `${Math.round(message.deliveryLatencyMs)}ms`
                        : "Delivered"}
                    </Text>
                  </View>
                )}
            </View>
          </View>

          {/* Star Button (only when not in selection mode) */}
          {!isSelectionMode && (
            <TouchableOpacity
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              onPress={handleStarPress}
              style={styles.starCol}
            >
              <Star
                size={18}
                color={isStarred ? "#f59e0b" : isDark ? "#334155" : "#cbd5e1"}
                fill={isStarred ? "#f59e0b" : "transparent"}
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};


const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    backgroundColor: "#0b0c10",
  },
  backgroundActionsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftActionReveal: {
    width: 120,
    height: "100%",
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 22,
    gap: 8,
  },
  rightActionReveal: {
    width: 120,
    height: "100%",
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 22,
    gap: 8,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  animatedCard: {
    width: "100%",
  },
  container: {
    position: "relative",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "flex-start",
  },
  unreadCard: {
    backgroundColor: "#11131c",
  },
  readCard: {
    backgroundColor: "#0b0c10",
  },
  selectedCard: {
    backgroundColor: "#151b2e",
    borderLeftWidth: 3.5,
    borderLeftColor: "#3b82f6",
  },
  unreadAccentBar: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: "#3b82f6",
  },
  checkboxCol: {
    marginRight: 14,
    paddingTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxUnchecked: {
    borderWidth: 2,
    borderColor: "#475569",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  avatarCol: {
    marginRight: 12,
    paddingTop: 1,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  senderText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    fontWeight: "500",
  },
  senderUnreadWeight: {
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  senderUnread: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  senderRead: {
    color: "#cbd5e1",
    fontWeight: "600",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  timeUnreadWeight: {
    fontWeight: "700",
  },
  timeUnread: {
    color: "#60a5fa",
    fontWeight: "700",
  },
  timeRead: {
    color: "#64748b",
    fontWeight: "500",
  },
  subjectText: {
    fontSize: 13.5,
    marginBottom: 3,
    fontWeight: "500",
  },
  subjectUnreadWeight: {
    fontWeight: "700",
  },
  subjectUnread: {
    color: "#f1f5f9",
    fontWeight: "700",
  },
  subjectRead: {
    color: "#94a3b8",
    fontWeight: "500",
  },
  snippetText: {
    fontSize: 12.5,
    color: "#64748b",
    lineHeight: 17,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 6,
    flexWrap: "wrap",
  },
  spamBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  spamBadgeText: {
    color: "#f87171",
    fontSize: 10,
    fontWeight: "700",
  },
  suspiciousBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  suspiciousBadgeText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "700",
  },
  attachmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  attachmentBadgeText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  threadBadge: {
    backgroundColor: "#181a24",
    borderWidth: 1,
    borderColor: "#232636",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  threadBadgeText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedBadgeText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "700",
  },
  deliverySuccessBadge: {
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
  deliverySuccessText: {
    color: "#34d399",
    fontSize: 9.5,
    fontWeight: "700",
  },
  deliveryOpenedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(129, 140, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  deliveryOpenedText: {
    color: "#a5b4fc",
    fontSize: 9.5,
    fontWeight: "700",
  },
  deliveryClickedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  deliveryClickedText: {
    color: "#fbbf24",
    fontSize: 9.5,
    fontWeight: "700",
  },
  deliveryBouncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  deliveryBouncedText: {
    color: "#f87171",
    fontSize: 9.5,
    fontWeight: "700",
  },
  starCol: {
    paddingTop: 4,
    paddingLeft: 4,
  },
});
