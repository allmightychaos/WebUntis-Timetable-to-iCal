// tests/04-fetch-week-raw.js
require("dotenv").config();
const { format, startOfWeek } = require("date-fns");
const { login } = require("../core/webuntisAuth");
const { fetchTimetableData } = require("../core/webuntisFetch");
const { getDefaultAccount } = require("../core/multiAccounts");
const fs = require("fs");
const path = require("path");

(async () => {
    try {
        const acct = getDefaultAccount();
        if (!acct)
            throw new Error("No default account (WEBUNTIS_ACCOUNTS empty)");
        const { sessionId, personId, personType } = await login(
            acct.domain,
            acct.school,
            acct.username,
            acct.password
        );
        const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
        const date = format(monday, "yyyy-MM-dd");
        const raw = await fetchTimetableData(
            sessionId,
            personType,
            personId,
            date,
            acct.domain
        );
        if (!raw) throw new Error("No raw data");

        const outDir = path.join(__dirname, "output");
        fs.mkdirSync(outDir, { recursive: true });

        // Write full JSON payload
        const fullPath = path.join(outDir, `raw-week-${date}.json`);
        fs.writeFileSync(fullPath, JSON.stringify(raw, null, 2), "utf8");

        console.log("Saved full raw JSON:", fullPath);
        console.log(
            "elements:",
            raw.elements?.length,
            "periods roots:",
            Object.keys(raw.elementPeriods || {}).length
        );
    } catch (e) {
        console.error("Fetch failed:", e.message);
        process.exit(1);
    }
})();
