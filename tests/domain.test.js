const assert = require("assert");
const https = require("https");
require("dotenv").config(); // Load environment variables from .env file
const { resolveWebUntisHost } = require("../core/domain");

const TEST_DOMAIN = process.env.WEBUNTIS_DOMAIN;
if (!TEST_DOMAIN) {
    throw new Error(
        "WEBUNTIS_DOMAIN is not set in your .env file. Please set it to a valid server name for testing."
    );
}

async function testValidDomain() {
    const originalRequest = https.request;
    // Mock https.request to simulate a successful connection
    https.request = (_opts, cb) => {
        const res = { statusCode: 200, on: () => {} };
        process.nextTick(() => cb(res));
        return { on: () => {}, end: () => {} };
    };
    try {
        const expectedHost = `${
            TEST_DOMAIN.charAt(0).toUpperCase() +
            TEST_DOMAIN.slice(1).toLowerCase()
        }.webuntis.com`;

        // Test with the domain from your .env file
        const host1 = await resolveWebUntisHost(TEST_DOMAIN);
        assert.strictEqual(host1, expectedHost);

        // Test with a full URL format
        const host2 = await resolveWebUntisHost(
            `https://${TEST_DOMAIN}.webuntis.com`
        );
        assert.strictEqual(host2, expectedHost);

        // Test with lowercase domain
        const host3 = await resolveWebUntisHost(TEST_DOMAIN.toLowerCase());
        assert.strictEqual(host3, expectedHost);

        // Test with uppercase domain
        const host4 = await resolveWebUntisHost(TEST_DOMAIN.toUpperCase());
        assert.strictEqual(host4, expectedHost);
    } finally {
        https.request = originalRequest; // Restore original function
    }
}

async function testInvalidDomain() {
    const invalidServerName = "this-server-does-not-exist";
    try {
        await resolveWebUntisHost(invalidServerName);
        assert.fail("Expected invalid domain error");
    } catch (err) {
        assert.strictEqual(
            err.message,
            "Entered server does not exist: " + invalidServerName
        );
    }
}

async function testUnreachableDomain() {
    const originalRequest = https.request;
    // Mock https.request to simulate a network failure
    https.request = () => {
        const { EventEmitter } = require("events");
        const req = new EventEmitter();
        req.end = () =>
            process.nextTick(() => req.emit("error", new Error("fail")));
        return req;
    };
    try {
        await resolveWebUntisHost(TEST_DOMAIN);
        assert.fail("Expected connection error");
    } catch (err) {
        const expectedHost = `${
            TEST_DOMAIN.charAt(0).toUpperCase() +
            TEST_DOMAIN.slice(1).toLowerCase()
        }.webuntis.com`;
        assert.strictEqual(
            err.message,
            "Could not connect to WebUntis server: " + expectedHost
        );
    } finally {
        https.request = originalRequest; // Restore original function
    }
}

async function run() {
    await testValidDomain();
    await testInvalidDomain();
    await testUnreachableDomain();
    console.log("✅ All domain tests passed");
}

run().catch((err) => {
    console.error("❌ Test run failed:", err);
    process.exit(1);
});
