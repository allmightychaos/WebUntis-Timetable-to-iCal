// src/core/webuntisFetch.js
const axios = require("axios");
const dotenv = require("dotenv");
const { resolveWebUntisHost } = require("./domain");
// Load .env only when not running on Netlify
if (!process.env.NETLIFY && !process.env.NETLIFY_DEV) {
    dotenv.config();
}

const domain = process.env.WEBUNTIS_DOMAIN;

async function fetchTimetableData(sessionId, personType, personId, date) {
    try {
        const host = await resolveWebUntisHost(domain);
        const url = `https://${host}/WebUntis/api/public/timetable/weekly/data?elementType=${personType}&elementId=${personId}&date=${date}&formatId=1`;
        const headers = {
            Cookie: `JSESSIONID=${sessionId};`,
            "User-Agent": "Mozilla/5.0",
        };

        const response = await axios.get(url, { headers });
        return response.data.data.result.data; // Check that this is correct
    } catch (error) {
        console.error(
            "Error fetching timetable data:",
            error.response?.data || error.message
        );
        return null;
    }
}

module.exports = { fetchTimetableData };
