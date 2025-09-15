const axios = require("axios");
const dotenv = require("dotenv");
const { resolveWebUntisHost } = require("./domain");
if (!process.env.NETLIFY && !process.env.NETLIFY_DEV) dotenv.config();
const domain = process.env.WEBUNTIS_DOMAIN;

async function fetchTimetableData(sessionId, personType, personId, date) {
    try {
        const host = await resolveWebUntisHost(domain);
        const url = `https://${host}/WebUntis/api/public/timetable/weekly/data?elementType=${personType}&elementId=${personId}&date=${date}&formatId=1`;
        const headers = {
            Cookie: `JSESSIONID=${sessionId};`,
            "User-Agent": "Mozilla/5.0",
        };
        const { data } = await axios.get(url, { headers });
        return data.data.result.data;
    } catch (e) {
        console.error(
            "Error fetching timetable data:",
            e.response?.data || e.message
        );
        return null;
    }
}

module.exports = { fetchTimetableData };
