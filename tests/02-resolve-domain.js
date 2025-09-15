// tests/02-resolve-domain.js
require("dotenv").config();
const { resolveWebUntisHost } = require("../core/domain");
const { getDefaultAccount } = require("../core/multiAccounts");

(async () => {
    try {
        const acct = getDefaultAccount();
        if (!acct)
            throw new Error("No default account (WEBUNTIS_ACCOUNTS empty)");
        const host = await resolveWebUntisHost(acct.domain);
        console.log("Resolved Host:", host);
    } catch (e) {
        console.error("Resolve failed:", e.message);
        process.exit(1);
    }
})();
