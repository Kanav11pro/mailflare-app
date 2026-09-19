import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Check,
  X,
  HelpCircle,
  Users,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { CalendarEventData } from "../types";
import { api } from "../api/client";

interface CalendarInviteCardProps {
  messageId: string;
  event: CalendarEventData;
  onRsvpSuccess?: (action: "accept" | "decline" | "tentative") => void;
}

export const CalendarInviteCard: React.FC<CalendarInviteCardProps> = ({
  messageId,
  event,
  onRsvpSuccess,
}) => {
  const [currentStatus, setCurrentStatus] = useState<
    "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION"
  >(event.userStatus || "NEEDS-ACTION");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const startDate = event.dtStart ? new Date(event.dtStart) : null;
  const endDate = event.dtEnd ? new Date(event.dtEnd) : null;

  const monthStr = startDate
    ? startDate.toLocaleString("en-US", { month: "short" }).toUpperCase()
    : "";
  const dayStr = startDate ? startDate.getDate() : "";
  const weekdayStr = startDate
    ? startDate.toLocaleString("en-US", { weekday: "short" })
    : "";

  const timeRangeStr = startDate
    ? event.isAllDay
      ? "All Day Event"
      : `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${
          endDate
            ? endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : ""
        }`
    : "Time TBD";

  const handleRsvp = async (action: "accept" | "decline" | "tentative") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmittingAction(action);

    try {
      await api.rsvpCalendarEvent(messageId, action);
      const newStat =
        action === "accept"
          ? "ACCEPTED"
          : action === "decline"
          ? "DECLINED"
          : "TENTATIVE";
      setCurrentStatus(newStat);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRsvpSuccess?.(action);
    } catch (err: any) {
      Alert.alert("RSVP Failed", err.message || "Failed to submit RSVP");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleOpenConference = async (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert("Link", url);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* Top Banner Header */}
      <View style={styles.headerRow}>
        {/* Date Box */}
        <View style={styles.dateBox}>
          <Text style={styles.dateMonthText}>{monthStr}</Text>
          <Text style={styles.dateDayText}>{dayStr}</Text>
          <Text style={styles.dateWeekdayText}>{weekdayStr}</Text>
        </View>

        {/* Title & Time */}
        <View style={styles.headerDetails}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Calendar size={10} color="#60a5fa" />
              <Text style={styles.typeBadgeText}>CALENDAR INVITATION</Text>
            </View>
            {currentStatus !== "NEEDS-ACTION" && (
              <View
                style={[
                  styles.statusBadge,
                  currentStatus === "ACCEPTED"
                    ? styles.statusBadgeAccepted
                    : currentStatus === "DECLINED"
                    ? styles.statusBadgeDeclined
                    : styles.statusBadgeTentative,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    currentStatus === "ACCEPTED"
                      ? { color: "#34d399" }
                      : currentStatus === "DECLINED"
                      ? { color: "#f87171" }
                      : { color: "#fbbf24" },
                  ]}
                >
                  {currentStatus === "ACCEPTED"
                    ? "✓ Attending"
                    : currentStatus === "DECLINED"
                    ? "✕ Declined"
                    : "？ Tentative"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.summary}
          </Text>

          <View style={styles.metaRow}>
            <Clock size={12} color="#94a3b8" />
            <Text style={styles.metaText}>{timeRangeStr}</Text>
          </View>
        </View>
      </View>

      {/* Info Rows (Location / Video link / Organizer) */}
      <View style={styles.infoSection}>
        {event.conferenceUrl && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenConference(event.conferenceUrl!)}
            style={styles.conferenceBtn}
          >
            <Video size={13} color="#60a5fa" />
            <Text style={styles.conferenceBtnText} numberOfLines={1}>
              Join Video Call ({event.conferenceUrl})
            </Text>
          </TouchableOpacity>
        )}

        {event.location && !event.conferenceUrl && (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}

        {event.organizer && (
          <View style={styles.metaRow}>
            <User size={12} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>
              Organizer: {event.organizer.name || event.organizer.email}
            </Text>
          </View>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <View style={styles.metaRow}>
            <Users size={12} color="#94a3b8" />
            <Text style={styles.metaText}>
              {event.attendees.length} Attendee
              {event.attendees.length > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Interactive RSVP Action Bar */}
      <View style={styles.rsvpBar}>
        {/* Accept Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={submittingAction !== null}
          onPress={() => handleRsvp("accept")}
          style={[
            styles.rsvpBtn,
            styles.acceptBtn,
            currentStatus === "ACCEPTED" && styles.acceptBtnSelected,
          ]}
        >
          {submittingAction === "accept" ? (
            <ActivityIndicator size="small" color="#34d399" />
          ) : (
            <>
              <Check
                size={14}
                color={currentStatus === "ACCEPTED" ? "#ffffff" : "#34d399"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.rsvpBtnText,
                  currentStatus === "ACCEPTED"
                    ? styles.rsvpBtnTextSelected
                    : { color: "#34d399" },
                ]}
              >
                Yes
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Tentative Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={submittingAction !== null}
          onPress={() => handleRsvp("tentative")}
          style={[
            styles.rsvpBtn,
            styles.tentativeBtn,
            currentStatus === "TENTATIVE" && styles.tentativeBtnSelected,
          ]}
        >
          {submittingAction === "tentative" ? (
            <ActivityIndicator size="small" color="#fbbf24" />
          ) : (
            <>
              <HelpCircle
                size={14}
                color={currentStatus === "TENTATIVE" ? "#ffffff" : "#fbbf24"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.rsvpBtnText,
                  currentStatus === "TENTATIVE"
                    ? styles.rsvpBtnTextSelected
                    : { color: "#fbbf24" },
                ]}
              >
                Maybe
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Decline Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={submittingAction !== null}
          onPress={() => handleRsvp("decline")}
          style={[
            styles.rsvpBtn,
            styles.declineBtn,
            currentStatus === "DECLINED" && styles.declineBtnSelected,
          ]}
        >
          {submittingAction === "decline" ? (
            <ActivityIndicator size="small" color="#f87171" />
          ) : (
            <>
              <X
                size={14}
                color={currentStatus === "DECLINED" ? "#ffffff" : "#f87171"}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.rsvpBtnText,
                  currentStatus === "DECLINED"
                    ? styles.rsvpBtnTextSelected
                    : { color: "#f87171" },
                ]}
              >
                No
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#12141e",
    borderWidth: 1,
    borderColor: "#222638",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dateBox: {
    width: 50,
    height: 60,
    backgroundColor: "#1a1d2c",
    borderWidth: 1,
    borderColor: "#282d44",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dateMonthText: {
    color: "#60a5fa",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dateDayText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  dateWeekdayText: {
    color: "#64748b",
    fontSize: 8.5,
    fontWeight: "700",
  },
  headerDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: {
    color: "#93c5fd",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeAccepted: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeDeclined: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusBadgeTentative: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  eventTitle: {
    color: "#f8fafc",
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    color: "#94a3b8",
    fontSize: 11.5,
    fontWeight: "500",
    flex: 1,
  },
  infoSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    gap: 6,
  },
  conferenceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 2,
  },
  conferenceBtnText: {
    color: "#60a5fa",
    fontSize: 11.5,
    fontWeight: "700",
    flex: 1,
  },
  rsvpBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  acceptBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  acceptBtnSelected: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  tentativeBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  tentativeBtnSelected: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  declineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  declineBtnSelected: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  rsvpBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rsvpBtnTextSelected: {
    color: "#ffffff",
  },
});
