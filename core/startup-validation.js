const { resolveWebUntisHost } = require("./domain");
require("dotenv").config();

/**
 * Startup environment validation.
 * - Ensures WEBUNTIS_DOMAIN present
 * - Resolves host
 * - Retries once on transient network errors
 * - Does NOT call process.exit (throws instead so serverless can respond)
 * - Can be skipped by VALIDATION_SKIP=1
 */
async function validateEnvironment() {
    if (process.env.VALIDATION_SKIP === "1") {
        console.log("[validation] Skipped (VALIDATION_SKIP=1).");
        return;
    }

    console.log("Performing startup environment validation...");
    const domain = (process.env.WEBUNTIS_DOMAIN || "").trim();
    if (!domain) throw new Error("WEBUNTIS_DOMAIN is not set.");

    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const resolvedHost = await resolveWebUntisHost(domain);
            console.log(
                `✅ Environment validation successful (attempt ${attempt}). Using server: ${resolvedHost}`
            );
            return;
        } catch (e) {
            lastErr = e;
            const transient =
                /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up/i.test(
                    e.message
                );
            console.warn(
                `[validation] attempt ${attempt} failed: ${e.message}${
                    attempt === 1 && transient ? " (will retry)" : ""
                }`
            );
            if (!(transient && attempt === 1)) break;
        }
    }
    throw new Error(`Environment validation failed: ${lastErr.message}`);
}

module.exports = { validateEnvironment };
