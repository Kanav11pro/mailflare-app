/**
 * Action Item & Meeting Intent Extraction Engine
 * Parses natural language scheduling proposals, deadlines, and task requests.
 */

export interface DetectedActionItem {
	id: string;
	type: "meeting" | "deadline" | "task";
	title: string;
	dateSnippet?: string;
	suggestedDate?: string; // ISO String
	snippet: string;
	confidence: number;
}

const MEETING_PATTERNS = [
	/(?:let['’]?s\s+(?:meet|catch\s+up|sync|hop\s+on\s+a\s+call|jump\s+on\s+a\s+zoom|chat)|can\s+we\s+(?:meet|talk|sync|speak)|meeting\s+(?:on|at|for)|scheduled\s+a\s+(?:call|sync))\s+([^.\n?!,;]{3,60})/i,
	/(?:how\s+about|are\s+you\s+free|available)\s+(?:on\s+)?((?:today|tomorrow|this\s+\w+|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2})[^.\n?!,;]{0,40})/i,
	/(?:zoom|google\s+meet|teams)\s+(?:link|meeting|call)\s+(?:at|on)\s+([^.\n?!,;]{3,60})/i,
];

const DEADLINE_PATTERNS = [
	/(?:deadline(?:\s+is)?|due(?:\s+date)?|by|before|no\s+later\s+than)\s+((?:today|tomorrow|eod|end\s+of\s+day|this\s+friday|next\s+\w+|monday|tuesday|wednesday|thursday|friday|\d{1,2}\/\d{1,2}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)[^.\n?!,;]{0,40})/i,
	/(?:please\s+(?:review|send|complete|submit|approve|check|sign|update|finalize))\s+([^.\n?!,;]{5,60}\s+(?:by|before|until)\s+[^.\n?!,;]{3,40})/i,
];

const TIME_REGEX = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|est|pst|cst|gmt|utc))\b/i;
const DAY_OFFSET_MAP: Record<string, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
};

/**
 * Attempts to parse a relative or natural language date string into an estimated Date.
 */
function estimateDateFromSnippet(snippet: string, referenceDate = new Date()): Date | null {
	const text = snippet.toLowerCase();
	const base = new Date(referenceDate);

	let targetDate = new Date(base);
	let matched = false;

	if (text.includes("tomorrow")) {
		targetDate.setDate(targetDate.getDate() + 1);
		matched = true;
	} else if (text.includes("today") || text.includes("tonight")) {
		matched = true;
	} else if (text.includes("next week")) {
		targetDate.setDate(targetDate.getDate() + 7);
		matched = true;
	} else {
		// Day of week matching
		for (const [day, offset] of Object.entries(DAY_OFFSET_MAP)) {
			if (text.includes(day)) {
				const currentDay = targetDate.getDay();
				let diff = offset - currentDay;
				if (diff <= 0) diff += 7;
				targetDate.setDate(targetDate.getDate() + diff);
				matched = true;
				break;
			}
		}
	}

	// Time matching (e.g. 3pm, 2:30 PM, 11:00am)
	const timeMatch = snippet.match(TIME_REGEX);
	if (timeMatch) {
		const rawTime = timeMatch[1].toLowerCase();
		const isPm = rawTime.includes("pm");
		const cleanTime = rawTime.replace(/(am|pm|est|pst|cst|gmt|utc|\s)/gi, "");
		const [hStr, mStr] = cleanTime.split(":");
		let hour = parseInt(hStr, 10);
		const min = mStr ? parseInt(mStr, 10) : 0;

		if (isPm && hour < 12) hour += 12;
		if (!isPm && hour === 12) hour = 0;

		targetDate.setHours(hour, min, 0, 0);
	} else {
		// Default to 10:00 AM or EOD 17:00
		if (text.includes("eod") || text.includes("end of day")) {
			targetDate.setHours(17, 0, 0, 0);
		} else {
			targetDate.setHours(10, 0, 0, 0);
		}
	}

	return matched ? targetDate : null;
}

/**
 * Extracts action items, meeting proposals, and deadlines from email subject and body.
 */
export function extractActionItemsAndMeetings(options: {
	subject?: string | null;
	textBody?: string | null;
	receivedAt?: Date | string | null;
}): DetectedActionItem[] {
	const { subject = "", textBody = "", receivedAt } = options;
	const refDate = receivedAt ? new Date(receivedAt) : new Date();
	const combined = `${subject || ""}\n${textBody || ""}`;
	if (!combined.trim()) return [];

	const items: DetectedActionItem[] = [];
	const seenSnippets = new Set<string>();

	// 1. Scan for meeting propositions
	for (const pattern of MEETING_PATTERNS) {
		const match = combined.match(pattern);
		if (match && match[0]) {
			const rawSnippet = match[0].trim();
			const dateSnippet = match[1]?.trim();
			if (seenSnippets.has(rawSnippet)) continue;
			seenSnippets.add(rawSnippet);

			const estimatedDate = dateSnippet ? estimateDateFromSnippet(dateSnippet, refDate) : null;
			items.push({
				id: `act_${Math.random().toString(36).slice(2, 9)}`,
				type: "meeting",
				title: subject?.startsWith("Re:") ? subject.slice(3).trim() : `Meeting: ${subject || "Sync Call"}`,
				dateSnippet: dateSnippet || rawSnippet,
				suggestedDate: estimatedDate ? estimatedDate.toISOString() : undefined,
				snippet: rawSnippet,
				confidence: 0.88,
			});
			break; // Limit to 1 meeting card per message
		}
	}

	// 2. Scan for deadlines and action items
	for (const pattern of DEADLINE_PATTERNS) {
		const match = combined.match(pattern);
		if (match && match[0]) {
			const rawSnippet = match[0].trim();
			const dateSnippet = match[1]?.trim();
			if (seenSnippets.has(rawSnippet)) continue;
			seenSnippets.add(rawSnippet);

			const estimatedDate = dateSnippet ? estimateDateFromSnippet(dateSnippet, refDate) : null;
			items.push({
				id: `act_${Math.random().toString(36).slice(2, 9)}`,
				type: "deadline",
				title: `Action Required: ${rawSnippet.length > 40 ? `${rawSnippet.slice(0, 40)}...` : rawSnippet}`,
				dateSnippet: dateSnippet || rawSnippet,
				suggestedDate: estimatedDate ? estimatedDate.toISOString() : undefined,
				snippet: rawSnippet,
				confidence: 0.82,
			});
			break; // Limit to 1 deadline card per message
		}
	}

	return items;
}
