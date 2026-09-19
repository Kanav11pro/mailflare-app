import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import {
  Clock,
  Sun,
  Sunrise,
  Coffee,
  Calendar,
  X,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Message } from "../types";

interface SnoozeSheetProps {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onSelectSnooze: (snoozeDate: Date) => void;
}

export const SnoozeSheet: React.FC<SnoozeSheetProps> = ({
  visible,
  message,
  onClose,
  onSelectSnooze,
}) => {
  if (!message) return null;

  const now = new Date();

  // Helper date calculations
  const laterToday = new Date(now);
  laterToday.setHours(18, 0, 0, 0);
  if (laterToday <= now) {
    laterToday.setHours(21, 0, 0, 0); // If past 6pm, offer 9pm
  }

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(8, 0, 0, 0);

  const thisWeekend = new Date(now);
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  thisWeekend.setDate(thisWeekend.getDate() + daysUntilSaturday);
  thisWeekend.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
  nextWeek.setHours(8, 0, 0, 0);

  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(9, 0, 0, 0);

  const PRESETS = [
    {
      id: "later_today",
      title: "Later Today",
      subtitle: laterToday.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      date: laterToday,
      icon: Sun,
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.12)",
    },
    {
      id: "tomorrow",
      title: "Tomorrow Morning",
      subtitle: `${tomorrowMorning.toLocaleDateString([], { weekday: "short" })}, 8:00 AM`,
      date: tomorrowMorning,
      icon: Sunrise,
      color: "#3b82f6",
      bgColor: "rgba(59, 130, 246, 0.12)",
    },
    {
      id: "weekend",
      title: "This Weekend",
      subtitle: `${thisWeekend.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, 9:00 AM`,
      date: thisWeekend,
      icon: Coffee,
      color: "#a855f7",
      bgColor: "rgba(168, 85, 247, 0.12)",
    },
    {
      id: "next_week",
      title: "Next Week",
      subtitle: `${nextWeek.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, 8:00 AM`,
      date: nextWeek,
      icon: Calendar,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
    },
    {
      id: "three_days",
      title: "In 3 Days",
      subtitle: `${inThreeDays.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, 9:00 AM`,
      date: inThreeDays,
      icon: Clock,
      color: "#ec4899",
      bgColor: "rgba(236, 72, 153, 0.12)",
    },
  ];

  const handlePick = (date: Date) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectSnooze(date);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.headerIcon}>
                <Clock size={18} color="#a855f7" />
              </View>
              <Text style={styles.headerTitle}>Snooze Email</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Subject Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewSubject} numberOfLines={1}>
              {message.subject || "(No Subject)"}
            </Text>
            <Text style={styles.previewSubtitle}>
              Temporarily hide from Inbox until the selected time
            </Text>
          </View>

          {/* Presets List */}
          <View style={styles.presetsList}>
            {PRESETS.map((preset) => {
              const IconComp = preset.icon;
              return (
                <TouchableOpacity
                  key={preset.id}
                  activeOpacity={0.7}
                  onPress={() => handlePick(preset.date)}
                  style={styles.presetRow}
                >
                  <View style={[styles.presetIconBox, { backgroundColor: preset.bgColor }]}>
                    <IconComp size={18} color={preset.color} />
                  </View>
                  <View style={styles.presetTextContainer}>
                    <Text style={styles.presetTitle}>{preset.title}</Text>
                    <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#13141d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#222534",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2230",
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#181a24",
  },
  previewBox: {
    backgroundColor: "#181a24",
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#232636",
  },
  previewSubject: {
    color: "#f8fafc",
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  previewSubtitle: {
    color: "#64748b",
    fontSize: 11.5,
  },
  presetsList: {
    gap: 8,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181a24",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#222534",
  },
  presetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  presetTextContainer: {
    flex: 1,
  },
  presetTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  presetSubtitle: {
    color: "#94a3b8",
    fontSize: 11.5,
    marginTop: 2,
  },
});
