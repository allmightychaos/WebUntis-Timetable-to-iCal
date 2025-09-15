const axios = require("axios");
const dotenv = require("dotenv");
const { resolveWebUntisHost } = require("./domain");
const { getDefaultAccount } = require("./multiAccounts");
if (!process.env.NETLIFY && !process.env.NETLIFY_DEV) dotenv.config();

async function fetchTimetableData(a, b, c, d, e) {
    // Overload patterns:
    // 1) fetchTimetableData(domain, sessionId, personType, personId, date)
    // 2) fetchTimetableData(sessionId, personType, personId, date) -> domain from first account
    let domain, sessionId, personType, personId, date;
    if (typeof a === "string" && typeof b === "string" && e !== undefined) {
        domain = a;
        sessionId = b;
        personType = c;
        personId = d;
        date = e;
    } else {
        sessionId = a;
        personType = b;
        personId = c;
        date = d;
        const acct = getDefaultAccount();
        domain = acct ? acct.domain : undefined;
    }
    if (!domain) {
        console.error(
            "Error fetching timetable data: domain missing (no account domain resolved)"
        );
        return null;
    }
    try {
        const host = await resolveWebUntisHost(domain);
        const url = `https://${host}/WebUntis/api/public/timetable/weekly/data?elementType=${personType}&elementId=${personId}&date=${date}&formatId=1`;
        const headers = {
            Cookie: `JSESSIONID=${sessionId};`,
            "User-Agent": "Mozilla/5.0",
        };
        const { data } = await axios.get(url, { headers });
        return data.data.result.data;
    } catch (e2) {
        console.error(
            "Error fetching timetable data:",
            e2.response?.data || e2.message
        );
        return null;
    }
}

module.exports = { fetchTimetableData };
