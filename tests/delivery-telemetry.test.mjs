import assert from "node:assert/strict";
import test from "node:test";
import {
	formatDeliveryLatency,
	calculateDeliveryLatency,
	buildDeliveryTimeline,
} from "../src/lib/email/delivery-telemetry.ts";

test("formatDeliveryLatency formats sub-second and multi-second latencies accurately", () => {
	assert.equal(formatDeliveryLatency(450), "450ms");
	assert.equal(formatDeliveryLatency(0), "0ms");
	assert.equal(formatDeliveryLatency(999), "999ms");
	assert.equal(formatDeliveryLatency(1200), "1.2s");
	assert.equal(formatDeliveryLatency(3500), "3.5s");
	assert.equal(formatDeliveryLatency(null), null);
	assert.equal(formatDeliveryLatency(undefined), null);
	assert.equal(formatDeliveryLatency(-50), null);
});

test("calculateDeliveryLatency accurately measures duration between creation and event", () => {
	const start = new Date("2026-09-20T12:00:00.000Z");
	const end = new Date("2026-09-20T12:00:00.750Z");
	assert.equal(calculateDeliveryLatency(start, end), 750);

	const stringStart = "2026-09-20T12:00:00.000Z";
	const stringEnd = "2026-09-20T12:00:01.500Z";
	assert.equal(calculateDeliveryLatency(stringStart, stringEnd), 1500);
});

test("buildDeliveryTimeline generates accurate milestones for successfully delivered, opened and clicked email", () => {
	const createdAt = new Date("2026-09-20T12:00:00.000Z");
	const deliveryAt = new Date("2026-09-20T12:00:00.820Z");
	const openedAt = new Date("2026-09-20T12:05:00.000Z");
	const clickedAt = new Date("2026-09-20T12:06:30.000Z");

	const timeline = buildDeliveryTimeline({
		createdAt,
		status: "sent",
		deliveryStatus: "delivered",
		deliveryAt,
		deliveryLatencyMs: 820,
		openedAt,
		openCount: 2,
		clickedAt,
		clickCount: 1,
		lastClickedUrl: "https://studyholic.xyz/pricing",
	});

	assert.equal(timeline.length, 5);
	assert.equal(timeline[0].type, "created");
	assert.equal(timeline[1].type, "sent");
	assert.equal(timeline[2].type, "delivered");
	assert.match(timeline[2].title, /820ms/);
	assert.equal(timeline[3].type, "opened");
	assert.match(timeline[3].title, /2 times/);
	assert.equal(timeline[4].type, "clicked");
	assert.match(timeline[4].description, /studyholic\.xyz\/pricing/);
});

test("buildDeliveryTimeline accurately captures bounced diagnostics and stops downstream progression", () => {
	const createdAt = new Date("2026-09-20T12:00:00.000Z");
	const deliveryAt = new Date("2026-09-20T12:00:01.000Z");

	const timeline = buildDeliveryTimeline({
		createdAt,
		status: "bounced",
		deliveryStatus: "bounced",
		deliveryAt,
		deliveryBounceType: "Permanent",
		deliveryError: "550 5.1.1 Recipient user does not exist on remote server",
	});

	assert.equal(timeline.length, 3);
	assert.equal(timeline[0].type, "created");
	assert.equal(timeline[1].type, "sent");
	assert.equal(timeline[2].type, "bounced");
	assert.equal(timeline[2].status, "failed");
	assert.match(timeline[2].description, /550 5\.1\.1/);
});
