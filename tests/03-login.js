// tests/03-login.js (multi-account default)
require("dotenv").config();
const { login } = require("../core/webuntisAuth");
const { getDefaultAccount } = require("../core/multiAccounts");

(async () => {
    try {
        const acct = getDefaultAccount();
        if (!acct)
            throw new Error("No default account (WEBUNTIS_ACCOUNTS empty)");
        const res = await login(
            acct.domain,
            acct.school,
            acct.username,
            acct.password
        );
        if (!res) throw new Error("Login returned null");
        console.log("Keys:", Object.keys(res));
        console.log(
            "SessionId (trunc):",
            (res.sessionId || "").slice(0, 12) + "..."
        );
    } catch (e) {
        console.error("Login failed:", e.message);
        process.exit(1);
    }
})();
