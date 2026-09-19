import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import {
  Send,
  RotateCw,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { OutboxItem } from "../lib/outbox";

interface OutboxCardProps {
  item: OutboxItem;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  isRetrying?: boolean;
}

export const OutboxCard: React.FC<OutboxCardProps> = ({
  item,
  onRetry,
  onDelete,
  isRetrying = false,
}) => {
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Delete Outbox Message",
      "Remove this queued email from your Outbox?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(item.id);
          },
        },
      ]
    );
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry(item.id);
  };

  const isSending = item.status === "sending" || isRetrying;
  const isFailed = item.status === "failed";

  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <View
      style={[
        styles.cardContainer,
        isFailed && styles.cardFailed,
        isSending && styles.cardSending,
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.toContainer}>
          <Text style={styles.toLabel}>To:</Text>
          <Text style={styles.toText} numberOfLines={1}>
            {item.to}
          </Text>
        </View>

        {/* Status Pill */}
        <View
          style={[
            styles.statusPill,
            isFailed
              ? styles.statusPillFailed
              : isSending
              ? styles.statusPillSending
              : styles.statusPillQueued,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#60a5fa" style={{ transform: [{ scale: 0.7 }] }} />
          ) : isFailed ? (
            <AlertCircle size={10} color="#f87171" />
          ) : (
            <Clock size={10} color="#fbbf24" />
          )}
          <Text
            style={[
              styles.statusText,
              isFailed
                ? { color: "#f87171" }
                : isSending
                ? { color: "#93c5fd" }
                : { color: "#fbbf24" },
            ]}
          >
            {isSending ? "Sending..." : isFailed ? "Failed" : "Queued"}
          </Text>
        </View>
      </View>

      {/* Subject */}
      <Text style={styles.subjectText} numberOfLines={1}>
        {item.subject || "(No Subject)"}
      </Text>

      {/* Snippet */}
      <Text style={styles.snippetText} numberOfLines={2}>
        {item.text || "(No message body)"}
      </Text>

      {/* Error Message if Failed */}
      {isFailed && item.lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} numberOfLines={2}>
            ⚠️ {item.lastError}
          </Text>
        </View>
      )}

      {/* Bottom Footer Actions */}
      <View style={styles.footerRow}>
        <Text style={styles.timestampText}>
          {dateStr} • {item.attempts} attempt{item.attempts !== 1 ? "s" : ""}
        </Text>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleDelete}
            style={styles.actionBtn}
          >
            <Trash2 size={15} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            disabled={isSending}
            onPress={handleRetry}
            style={[styles.retryBtn, isSending && { opacity: 0.5 }]}
          >
            <RotateCw size={13} color="#ffffff" />
            <Text style={styles.retryBtnText}>Retry Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#13141d",
    borderWidth: 1,
    borderColor: "#222534",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cardFailed: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  cardSending: {
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  toContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  toLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  toText: {
    color: "#cbd5e1",
    fontSize: 12.5,
    fontWeight: "700",
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusPillQueued: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusPillSending: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statusPillFailed: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  subjectText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 4,
  },
  snippetText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 11,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  timestampText: {
    color: "#64748b",
    fontSize: 11,
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },
});
