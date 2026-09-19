/**
 * iCalendar (RFC 5545) Parser and RFC 5546 iMIP RSVP Generator
 */

export interface CalendarAttendee {
	name?: string;
	email: string;
	role?: string;
	partStat?: "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION";
}

export interface ParsedCalendarEvent {
	uid: string;
	method?: string; // REQUEST, REPLY, CANCEL, PUBLISH
	sequence?: number;
	summary: string;
	description?: string;
	location?: string;
	url?: string;
	conferenceUrl?: string;
	dtStart: Date | null;
	dtEnd: Date | null;
	isAllDay: boolean;
	organizer?: { name?: string; email: string };
	attendees: CalendarAttendee[];
	status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
	rrule?: string;
	rawIcs?: string;
}

/**
 * Unfolds iCalendar lines according to RFC 5545 (CRLF/LF followed by space or tab).
 */
function unfoldIcs(icsText: string): string[] {
	const normalized = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const unfolded = normalized.replace(/\n[ \t]/g, "");
	return unfolded
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

/**
 * Parses an iCalendar date/datetime string (e.g. 20260920T150000Z, 20260920T150000, 20260920).
 */
export function parseIcsDate(val: string): { date: Date | null; isAllDay: boolean } {
	if (!val) return { date: null, isAllDay: false };
	const clean = val.trim();

	// All-day date: YYYYMMDD
	if (/^\d{8}$/.test(clean)) {
		const y = parseInt(clean.slice(0, 4), 10);
		const m = parseInt(clean.slice(4, 6), 10) - 1;
		const d = parseInt(clean.slice(6, 8), 10);
		return { date: new Date(Date.UTC(y, m, d)), isAllDay: true };
	}

	// UTC DateTime: YYYYMMDDTHHMMSSZ
	if (/^\d{8}T\d{6}Z$/.test(clean)) {
		const y = parseInt(clean.slice(0, 4), 10);
		const m = parseInt(clean.slice(4, 6), 10) - 1;
		const d = parseInt(clean.slice(6, 8), 10);
		const hh = parseInt(clean.slice(9, 11), 10);
		const mm = parseInt(clean.slice(11, 13), 10);
		const ss = parseInt(clean.slice(13, 15), 10);
		return { date: new Date(Date.UTC(y, m, d, hh, mm, ss)), isAllDay: false };
	}

	// Local DateTime: YYYYMMDDTHHMMSS
	if (/^\d{8}T\d{6}$/.test(clean)) {
		const y = parseInt(clean.slice(0, 4), 10);
		const m = parseInt(clean.slice(4, 6), 10) - 1;
		const d = parseInt(clean.slice(6, 8), 10);
		const hh = parseInt(clean.slice(9, 11), 10);
		const mm = parseInt(clean.slice(11, 13), 10);
		const ss = parseInt(clean.slice(13, 15), 10);
		return { date: new Date(y, m, d, hh, mm, ss), isAllDay: false };
	}

	const fallback = new Date(clean);
	return {
		date: Number.isNaN(fallback.getTime()) ? null : fallback,
		isAllDay: false,
	};
}

/**
 * Formats a JavaScript Date to RFC 5545 UTC string format (YYYYMMDDTHHMMSSZ).
 */
export function formatIcsDate(date: Date): string {
	const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
	return (
		`${date.getUTCFullYear()}` +
		`${pad(date.getUTCMonth() + 1)}` +
		`${pad(date.getUTCDate())}T` +
		`${pad(date.getUTCHours())}` +
		`${pad(date.getUTCMinutes())}` +
		`${pad(date.getUTCSeconds())}Z`
	);
}

/**
 * Parses an iCalendar payload string and returns structured event data.
 */
export function parseIcs(icsContent: string): ParsedCalendarEvent | null {
	if (!icsContent || !icsContent.includes("BEGIN:VCALENDAR")) {
		return null;
	}

	const lines = unfoldIcs(icsContent);
	let insideEvent = false;
	let method: string | undefined;

	let uid = "";
	let summary = "";
	let description: string | undefined;
	let location: string | undefined;
	let url: string | undefined;
	let conferenceUrl: string | undefined;
	let dtStart: Date | null = null;
	let dtEnd: Date | null = null;
	let isAllDay = false;
	let sequence = 0;
	let status: "CONFIRMED" | "TENTATIVE" | "CANCELLED" | undefined;
	let rrule: string | undefined;
	let organizer: { name?: string; email: string } | undefined;
	const attendees: CalendarAttendee[] = [];

	for (const line of lines) {
		const colonIdx = line.indexOf(":");
		if (colonIdx === -1) continue;

		const fullKey = line.slice(0, colonIdx);
		const value = line.slice(colonIdx + 1).trim();
		const keyParts = fullKey.split(";");
		const propName = keyParts[0].toUpperCase();
		const params: Record<string, string> = {};

		for (let i = 1; i < keyParts.length; i++) {
			const eqIdx = keyParts[i].indexOf("=");
			if (eqIdx !== -1) {
				const pKey = keyParts[i].slice(0, eqIdx).toUpperCase();
				const pVal = keyParts[i].slice(eqIdx + 1).replace(/^"(.*)"$/, "$1");
				params[pKey] = pVal;
			}
		}

		if (propName === "METHOD") {
			method = value.toUpperCase();
			continue;
		}

		if (propName === "BEGIN" && value.toUpperCase() === "VEVENT") {
			insideEvent = true;
			continue;
		}

		if (propName === "END" && value.toUpperCase() === "VEVENT") {
			insideEvent = false;
			continue;
		}

		if (!insideEvent) continue;

		switch (propName) {
			case "UID":
				uid = value;
				break;
			case "SUMMARY":
				summary = unescapeIcsText(value);
				break;
			case "DESCRIPTION":
				description = unescapeIcsText(value);
				break;
			case "LOCATION":
				location = unescapeIcsText(value);
				break;
			case "URL":
				url = value;
				break;
			case "X-GOOGLE-CONFERENCE":
			case "X-MICROSOFT-SKYPETEAMSMEETINGURL":
				conferenceUrl = value;
				break;
			case "SEQUENCE":
				sequence = parseInt(value, 10) || 0;
				break;
			case "STATUS": {
				const s = value.toUpperCase();
				if (s === "CONFIRMED" || s === "TENTATIVE" || s === "CANCELLED") {
					status = s;
				}
				break;
			}
			case "RRULE":
				rrule = value;
				break;
			case "DTSTART": {
				const parsed = parseIcsDate(value);
				dtStart = parsed.date;
				isAllDay = parsed.isAllDay;
				break;
			}
			case "DTEND": {
				const parsed = parseIcsDate(value);
				dtEnd = parsed.date;
				break;
			}
			case "ORGANIZER": {
				const email = value.replace(/^mailto:/i, "").trim();
				organizer = {
					name: params.CN || unescapeIcsText(params.CN || "") || undefined,
					email,
				};
				break;
			}
			case "ATTENDEE": {
				const email = value.replace(/^mailto:/i, "").trim();
				const partStatRaw = (params.PARTSTAT || "NEEDS-ACTION").toUpperCase();
				const partStat = (
					["ACCEPTED", "DECLINED", "TENTATIVE", "NEEDS-ACTION"].includes(partStatRaw)
						? partStatRaw
						: "NEEDS-ACTION"
				) as CalendarAttendee["partStat"];

				attendees.push({
					name: params.CN ? unescapeIcsText(params.CN) : undefined,
					email,
					role: params.ROLE,
					partStat,
				});
				break;
			}
			default:
				// Detect meeting URLs in description or location if not explicitly set
				if (!conferenceUrl && (propName === "DESCRIPTION" || propName === "LOCATION")) {
					const match = value.match(/https:\/\/(meet\.google\.com\/[a-z-]+|zoom\.us\/j\/\d+|teams\.microsoft\.com\/[^\s]+)/i);
					if (match) {
						conferenceUrl = match[0];
					}
				}
				break;
		}
	}

	if (!uid && !summary && !dtStart) {
		return null;
	}

	// Calculate end date if not provided (default 1 hour or same day)
	if (dtStart && !dtEnd) {
		dtEnd = new Date(dtStart.getTime() + (isAllDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
	}

	return {
		uid: uid || `mailflare-event-${Date.now()}`,
		method: method || "REQUEST",
		sequence,
		summary: summary || "(No Title)",
		description,
		location,
		url,
		conferenceUrl,
		dtStart,
		dtEnd,
		isAllDay,
		organizer,
		attendees,
		status: status || "CONFIRMED",
		rrule,
		rawIcs: icsContent,
	};
}

/**
 * Generates an RFC 5546 compliant iMIP VCALENDAR REPLY payload.
 */
export function generateRsvpReplyIcs(options: {
	event: ParsedCalendarEvent;
	attendeeEmail: string;
	attendeeName?: string;
	action: "accept" | "decline" | "tentative";
	comment?: string;
}): string {
	const { event, attendeeEmail, attendeeName, action, comment } = options;
	const now = new Date();
	const dtStamp = formatIcsDate(now);
	const startStr = event.dtStart ? formatIcsDate(event.dtStart) : dtStamp;
	const endStr = event.dtEnd ? formatIcsDate(event.dtEnd) : dtStamp;

	const partStat = action === "accept" ? "ACCEPTED" : action === "decline" ? "DECLINED" : "TENTATIVE";
	const cnParam = attendeeName ? `;CN=${escapeIcsText(attendeeName)}` : "";
	const orgCnParam = event.organizer?.name ? `;CN=${escapeIcsText(event.organizer.name)}` : "";
	const orgEmail = event.organizer?.email || "organizer@unknown.com";

	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"PRODID:-//Mailflare//Calendar Engine 1.0//EN",
		"VERSION:2.0",
		"METHOD:REPLY",
		"CALSCALE:GREGORIAN",
		"BEGIN:VEVENT",
		`UID:${event.uid}`,
		`DTSTAMP:${dtStamp}`,
		`SEQUENCE:${event.sequence ?? 0}`,
		`SUMMARY:${escapeIcsText(event.summary)}`,
		`DTSTART:${startStr}`,
		`DTEND:${endStr}`,
		`ORGANIZER${orgCnParam}:mailto:${orgEmail}`,
		`ATTENDEE${cnParam};PARTSTAT=${partStat}:mailto:${attendeeEmail}`,
		`STATUS:${action === "decline" ? "CANCELLED" : "CONFIRMED"}`,
	];

	if (comment) {
		lines.push(`COMMENT:${escapeIcsText(comment)}`);
	}

	lines.push("END:VEVENT");
	lines.push("END:VCALENDAR");

	return lines.join("\r\n");
}

function escapeIcsText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}

function unescapeIcsText(text: string): string {
	return text
		.replace(/\\n/g, "\n")
		.replace(/\\,/g, ",")
		.replace(/\\;/g, ";")
		.replace(/\\\\/g, "\\");
}
