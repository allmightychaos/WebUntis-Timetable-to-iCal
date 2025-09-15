// tests/07-generate-ical.js (first account from WEBUNTIS_ACCOUNTS)
require("dotenv").config();
const { format, startOfWeek } = require("date-fns");
const { generateIcal } = require("../core/timetableToIcal");
const fs = require("fs");
const path = require("path");

(async () => {
    try {
        const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
        const date = format(monday, "yyyy-MM-dd");
        const weeks = parseInt(process.argv[2] || "4", 10);
        const ics = await generateIcal(weeks, date, { debug: true });
        const outDir = path.join(__dirname, "output");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const filename = `test-${date}-w${weeks}.ics`;
        const outPath = path.join(outDir, filename);
        fs.writeFileSync(outPath, ics);
        console.log("Saved:", outPath);
    } catch (e) {
        console.error("generateIcal failed:", e.message);
        process.exit(1);
    }
})();
