const { resolveWebUntisHost } = require("./domain");
require("dotenv").config();

// Validates env + server reachability (retry once). Throw on failure.
async function validateEnvironment() {
    if (process.env.VALIDATION_SKIP === "1") {
        console.log("[validation] Skipped");
        return;
    }
    const domain = (process.env.WEBUNTIS_DOMAIN || "").trim();
    if (!domain) throw new Error("WEBUNTIS_DOMAIN is not set.");

    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const host = await resolveWebUntisHost(domain);
            console.log(`[validation] OK (attempt ${attempt}) host=${host}`);
            return;
        } catch (e) {
            lastErr = e;
            const transient =
                /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up/i.test(
                    e.message
                );
            console.warn(
                `[validation] attempt ${attempt} failed: ${e.message}${
                    attempt === 1 && transient ? " retrying" : ""
                }`
            );
            if (!(transient && attempt === 1)) break;
        }
    }
    throw new Error(`Environment validation failed: ${lastErr.message}`);
}

module.exports = { validateEnvironment };
