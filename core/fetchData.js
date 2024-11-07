// src/core/fetchData.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const domain = process.env.WEBUNTIS_DOMAIN;

export async function fetchTimetableData(sessionId, personType, personId, date) {
      try {
            const url = `https://${domain}.webuntis.com/WebUntis/api/public/timetable/weekly/data?elementType=${personType}&elementId=${personId}&date=${date}&formatId=1`;
            const headers = {
                  'Cookie': `JSESSIONID=${sessionId};`,
                  'User-Agent': 'Mozilla/5.0'
            };

            const response = await axios.get(url, { headers });
            return response.data.data.result.data;  // Check that this is correct
      } catch (error) {
            console.error("Error fetching timetable data:", error.response?.data || error.message);
            return null;
      }
}