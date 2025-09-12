// tests/03-login.js
require("dotenv").config();
const { login } = require("../core/webuntisAuth");

(async () => {
    try {
        const res = await login(
            process.env.WEBUNTIS_DOMAIN,
            process.env.WEBUNTIS_SCHOOL,
            process.env.WEBUNTIS_USERNAME,
            process.env.WEBUNTIS_PASSWORD
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
