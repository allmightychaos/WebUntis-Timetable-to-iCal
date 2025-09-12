// tests/02-resolve-domain.js
require("dotenv").config();
const { resolveWebUntisHost } = require("../core/domain");

(async () => {
    try {
        const host = await resolveWebUntisHost(process.env.WEBUNTIS_DOMAIN);
        console.log("Resolved Host:", host);
    } catch (e) {
        console.error("Resolve failed:", e.message);
        process.exit(1);
    }
})();
