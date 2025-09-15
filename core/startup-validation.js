const { resolveWebUntisHost } = require("./domain");
require("dotenv").config();

async function validateEnvironment() {
    if (process.env.VALIDATION_SKIP === "1") {
        console.log("[validation] skipped");
        return;
    }

    const accountsRaw = process.env.WEBUNTIS_ACCOUNTS;

    if (!accountsRaw) {
        throw new Error(
            "WEBUNTIS_ACCOUNTS not set (multi-account only mode now)"
        );
    }

    let accounts;
    try {
        accounts = JSON.parse(accountsRaw);
        if (!Array.isArray(accounts) || accounts.length === 0)
            throw new Error("WEBUNTIS_ACCOUNTS empty");
    } catch (e) {
        throw new Error("Invalid WEBUNTIS_ACCOUNTS JSON: " + e.message);
    }

    const valid = accounts.filter(
        (a) => a && a.domain && a.school && a.username && a.password
    );
    if (!valid.length)
        throw new Error("No valid account entries in WEBUNTIS_ACCOUNTS");

    const domains = [
        ...new Set(valid.map((a) => String(a.domain).trim()).filter(Boolean)),
    ];

    for (const d of domains) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const host = await resolveWebUntisHost(d);
                console.log(
                    `[validation] domain '${d}' OK (attempt ${attempt}) host=${host}`
                );
                break;
            } catch (e) {
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
}

module.exports = { validateEnvironment };
