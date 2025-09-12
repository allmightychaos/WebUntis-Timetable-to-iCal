// tests/01-validate-env.js
require("dotenv").config();
const { validateEnvironment } = require("../core/startup-validation");

(async () => {
    try {
        await validateEnvironment();
        console.log("✅ Environment OK");
    } catch (e) {
        console.error("❌ Validation failed:", e.message);
        process.exit(1);
    }
})();
