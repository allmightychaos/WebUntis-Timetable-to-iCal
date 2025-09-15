const { resolveWebUntisHost } = require("./domain");
require("dotenv").config();

async function validateEnvironment() {
    if (process.env.VALIDATION_SKIP === "1") {
        console.log("[validation] skipped");
        return;
    }

    const singleDomain = (process.env.WEBUNTIS_DOMAIN || "").trim();
    const accountsRaw = process.env.WEBUNTIS_ACCOUNTS;

    // Multi-account mode
    if (!singleDomain && accountsRaw) {
        let accounts;
        try {
            accounts = JSON.parse(accountsRaw);
            if (!Array.isArray(accounts) || accounts.length === 0)
                throw new Error("WEBUNTIS_ACCOUNTS empty");
        } catch (e) {
            throw new Error("Invalid WEBUNTIS_ACCOUNTS JSON: " + e.message);
        }

        const domains = [
            ...new Set(
                accounts
                    .map((a) => (a && a.domain ? String(a.domain).trim() : ""))
                    .filter(Boolean)
            ),
        ];
        if (!domains.length)
            throw new Error(
                "No valid domain entries found in WEBUNTIS_ACCOUNTS."
            );

        for (const d of domains) {
            let lastErr;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const host = await resolveWebUntisHost(d);
                    console.log(
                        `[validation] domain '${d}' OK (attempt ${attempt}) host=${host}`
                    );
                    break;
                } catch (e) {
                    lastErr = e;
                    const transient =
                        /ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(
                            e.message
                        );
                    console.warn(
                        `[validation] domain '${d}' attempt ${attempt} failed: ${
                            e.message
                        }${attempt === 1 && transient ? " retrying" : ""}`
                    );
                    if (!(transient && attempt === 1))
                        throw new Error(
                            `Environment validation failed for '${d}': ${e.message}`
                        );
                }
            }
        }
        return;
    }

    // Single-account mode (legacy)
    if (!singleDomain)
        throw new Error(
            "WEBUNTIS_DOMAIN is not set (and no WEBUNTIS_ACCOUNTS provided)."
        );

    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const host = await resolveWebUntisHost(singleDomain);
            console.log(`[validation] OK (attempt ${attempt}) host=${host}`);
            return;
        } catch (e) {
            lastErr = e;
            const transient =
                /ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(
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
