import assert from "node:assert/strict";
import test from "node:test";
import { parseIcs, generateRsvpReplyIcs } from "../src/lib/calendar/ics.ts";
import { extractActionItemsAndMeetings } from "../src/lib/calendar/action-items.ts";

const SAMPLE_GOOGLE_ICS = `BEGIN:VCALENDAR
PRODID:-//Google Inc//Google Calendar 70.9054//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:20261015T190000Z
DTEND:20261015T200000Z
DTSTAMP:20260915T180000Z
ORGANIZER;CN=Alice Founder:mailto:alice@startup.io
UID:event_abc123@google.com
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Bob Engineer:mailto:bob@studyholic.xyz
X-GOOGLE-CONFERENCE:https://meet.google.com/abc-defg-hij
DESCRIPTION:Quarterly engineering roadmap planning meeting.
LOCATION:https://meet.google.com/abc-defg-hij
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:Engineering Roadmap Q4
END:VEVENT
END:VCALENDAR`;

test("parseIcs accurately extracts event parameters from standard Google invite", () => {
	const event = parseIcs(SAMPLE_GOOGLE_ICS);
	assert.ok(event, "Event should be parsed successfully");
	assert.equal(event.uid, "event_abc123@google.com");
	assert.equal(event.summary, "Engineering Roadmap Q4");
	assert.equal(event.description, "Quarterly engineering roadmap planning meeting.");
	assert.equal(event.conferenceUrl, "https://meet.google.com/abc-defg-hij");
	assert.equal(event.organizer?.email, "alice@startup.io");
	assert.equal(event.organizer?.name, "Alice Founder");
	assert.equal(event.attendees.length, 1);
	assert.equal(event.attendees[0].email, "bob@studyholic.xyz");
	assert.equal(event.attendees[0].partStat, "NEEDS-ACTION");
	assert.equal(event.dtStart?.toISOString(), "2026-10-15T19:00:00.000Z");
	assert.equal(event.dtEnd?.toISOString(), "2026-10-15T20:00:00.000Z");
	assert.equal(event.isAllDay, false);
});

test("generateRsvpReplyIcs formats valid RFC 5546 REPLY payload", () => {
	const event = parseIcs(SAMPLE_GOOGLE_ICS);
	assert.ok(event);

	const rsvp = generateRsvpReplyIcs({
		event,
		attendeeEmail: "bob@studyholic.xyz",
		attendeeName: "Bob Engineer",
		action: "accept",
		comment: "Looking forward to it!",
	});

	assert.ok(rsvp.includes("BEGIN:VCALENDAR"));
	assert.ok(rsvp.includes("METHOD:REPLY"));
	assert.ok(rsvp.includes("UID:event_abc123@google.com"));
	assert.ok(rsvp.includes("PARTSTAT=ACCEPTED:mailto:bob@studyholic.xyz"));
	assert.ok(rsvp.includes("ORGANIZER;CN=Alice Founder:mailto:alice@startup.io"));
	assert.ok(rsvp.includes("COMMENT:Looking forward to it!"));
	assert.ok(rsvp.includes("END:VCALENDAR"));
});

test("extractActionItemsAndMeetings detects meeting requests and deadlines from text", () => {
	const items = extractActionItemsAndMeetings({
		subject: "Project Sync",
		textBody: "Hi team, let's meet tomorrow at 3pm to review the deployment. Also, please submit your timesheets by Friday EOD.",
		receivedAt: new Date("2026-09-15T12:00:00Z"),
	});

	assert.ok(items.length >= 1, "Should detect at least 1 action item");
	const meeting = items.find((i) => i.type === "meeting");
	assert.ok(meeting, "Should detect meeting item");
	assert.ok(meeting.suggestedDate, "Should parse estimated date");
});
