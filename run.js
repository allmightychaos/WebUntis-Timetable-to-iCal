// src/run.js
import dotenv from 'dotenv';
import { login } from './core/auth.js';
import { fetchTimetableData } from './core/fetchData.js';
import { processTimetableData, groupAndSortTimetable, insertFreePeriods } from './core/processData.js';
import { saveToFile } from './core/save.js';

dotenv.config();
const [domain, school, username, password] = [
    process.env.WEBUNTIS_DOMAIN,
    process.env.WEBUNTIS_SCHOOL,
    process.env.WEBUNTIS_USERNAME,
    process.env.WEBUNTIS_PASSWORD
];

async function processData() {
    const loginData = await login(domain, school, username, password);
    if (!loginData) {
        console.error('Login failed');
        return null;
    }

    const { sessionId, personId, personType } = loginData;
    const today = new Date().toISOString().slice(0, 10);
    const timetableData = await fetchTimetableData(sessionId, personType, personId, today);

    if (!timetableData) {
        console.error('Failed to fetch timetable data');
        return null;
    }

    // Process and filter elements without saving to intermediate files
    const elements = timetableData.elements;
    const filteredData = {
        classes: elements.filter(item => item.type === 1),
        teachers: elements.filter(item => item.type === 2),
        lessons: elements.filter(item => item.type === 3),
        rooms: elements.filter(item => item.type === 4)
    };

    return { filteredData, dataElementPeriods: timetableData.elementPeriods[personId] };
}

async function run() {
    try {
        const result = await processData();
        if (!result) {
            console.error('Failed to process data');
            return null;
        }

        const { filteredData, dataElementPeriods } = result;

        if (!dataElementPeriods || !Array.isArray(dataElementPeriods)) {
            console.error('dataElementPeriods is not valid:', dataElementPeriods);
            return null;
        }

        const processedData = await processTimetableData(dataElementPeriods, filteredData);
        const groupedAndSortedTimetable = groupAndSortTimetable(processedData);
        const finalTimetable = insertFreePeriods(groupedAndSortedTimetable);

        return finalTimetable;
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        return null;
    }
}

// Export run function for use in the Netlify function
module.exports = { run };
