import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import {
  Sparkles,
  CalendarPlus,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ActionItemData } from "../types";

interface ActionItemsCardProps {
  items: ActionItemData[];
  defaultSubject?: string;
}

export const ActionItemsCard: React.FC<ActionItemsCardProps> = ({
  items,
  defaultSubject = "Meeting",
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!items || items.length === 0) return null;

  const handleAddToCalendar = async (item: ActionItemData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const startDate = item.suggestedDate ? new Date(item.suggestedDate) : new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatCalDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
        d.getUTCHours()
      )}${pad(d.getUTCMinutes())}00Z`;

    const title = encodeURIComponent(item.title || defaultSubject);
    const details = encodeURIComponent(item.snippet);
    const dates = `${formatCalDate(startDate)}/${formatCalDate(endDate)}`;

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;

    try {
      const can = await Linking.canOpenURL(googleCalUrl);
      if (can) {
        await Linking.openURL(googleCalUrl);
      } else {
        Alert.alert("Action Item", item.snippet);
      }
    } catch {
      Alert.alert("Calendar Error", "Unable to launch system calendar.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Pill */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded((p) => !p);
        }}
        style={styles.headerRow}
      >
        <View style={styles.headerLeft}>
          <Sparkles size={13} color="#a855f7" />
          <Text style={styles.headerTitle}>
            {items.length === 1
              ? items[0].type === "meeting"
                ? "Suggested Meeting Detected"
                : "Action Item Detected"
              : `${items.length} Action Items Detected`}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={14} color="#94a3b8" />
        ) : (
          <ChevronDown size={14} color="#94a3b8" />
        )}
      </TouchableOpacity>

      {/* Expanded Items */}
      {expanded && (
        <View style={styles.itemsList}>
          {items.map((item) => {
            const isMeeting = item.type === "meeting";
            const dateStr = item.suggestedDate
              ? new Date(item.suggestedDate).toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : item.dateSnippet;

            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  {isMeeting ? (
                    <Clock size={14} color="#a855f7" style={{ marginTop: 2 }} />
                  ) : (
                    <CheckCircle2 size={14} color="#38bdf8" style={{ marginTop: 2 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {dateStr && <Text style={styles.itemDate}>📅 {dateStr}</Text>}
                    <Text style={styles.itemSnippet} numberOfLines={2}>
                      "{item.snippet}"
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleAddToCalendar(item)}
                  style={styles.addCalBtn}
                >
                  <CalendarPlus size={12} color="#c084fc" />
                  <Text style={styles.addCalBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.25)",
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    color: "#d8b4fe",
    fontSize: 12,
    fontWeight: "700",
  },
  itemsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(168, 85, 247, 0.15)",
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#151622",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 8,
  },
  itemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  itemTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  itemDate: {
    color: "#c084fc",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  itemSnippet: {
    color: "#94a3b8",
    fontSize: 10.5,
    marginTop: 2,
    fontStyle: "italic",
  },
  addCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    alignSelf: "center",
  },
  addCalBtnText: {
    color: "#e9d5ff",
    fontSize: 11,
    fontWeight: "700",
  },
});
