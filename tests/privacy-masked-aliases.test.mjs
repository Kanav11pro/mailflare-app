import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAndNeutralizeTrackers } from "../src/lib/email/privacy-shield.ts";

test("Privacy Shield neutralizes spy pixels and extracts tracker domains", () => {
	const dirtyHtml = `
		<div>
			<p>Hello, this is a marketing email.</p>
			<img src="https://mailtrack.io/trace/mail/12345.png" alt="tracker" />
			<img src="https://email.mixmax.com/e/o/abcde" width="1" height="1" />
			<img src="https://cdn.example.com/logo.png" width="300" height="80" alt="Logo" />
		</div>
	`;

	const result = sanitizeAndNeutralizeTrackers(dirtyHtml);
	assert.equal(result.trackersBlockedCount, 2);
	assert.ok(result.trackersBlockedDomains.includes("Mailtrack"));
	assert.ok(result.trackersBlockedDomains.includes("Mixmax"));
	assert.ok(!result.cleanHtml.includes("mailtrack.io"));
	assert.ok(!result.cleanHtml.includes("email.mixmax.com"));
	assert.ok(result.cleanHtml.includes("cdn.example.com/logo.png"));
});

test("Privacy Shield neutralizes 1x1 invisible web beacons", () => {
	const beaconHtml = `
		<div>
			<p>Welcome to our platform!</p>
			<img src="https://unknown-analytics.com/beacon.gif" width="0" height="0" />
			<img src="https://tracker.xyz/pixel" style="display:none;" />
		</div>
	`;

	const result = sanitizeAndNeutralizeTrackers(beaconHtml);
	assert.equal(result.trackersBlockedCount, 2);
	assert.ok(result.trackersBlockedDomains.includes("1x1 Spy Pixel"));
});

test("Privacy Shield handles null or empty HTML gracefully", () => {
	const emptyResult = sanitizeAndNeutralizeTrackers(null);
	assert.equal(emptyResult.trackersBlockedCount, 0);
	assert.equal(emptyResult.cleanHtml, "");
	assert.deepEqual(emptyResult.trackersBlockedDomains, []);
});
