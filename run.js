// src/run.js
const dotenv = require('dotenv');
dotenv.config();

const { login } = require('./core/auth.js');
const { fetchTimetableData } = require('./core/fetchData.js');
const { processTimetableData, groupAndSortTimetable, insertFreePeriods } = require('./core/processData.js');

const [domain, school, username, password] = [
    process.env.WEBUNTIS_DOMAIN,
    process.env.WEBUNTIS_SCHOOL,
    process.env.WEBUNTIS_USERNAME,
    process.env.WEBUNTIS_PASSWORD
];

async function processData(startDate) {
    const loginData = await login(domain, school, username, password);
    if (!loginData) {
        console.error('Login failed');
        return null;
    }

    const { sessionId, personId, personType } = loginData;
    const timetableData = await fetchTimetableData(sessionId, personType, personId, startDate);

    if (!timetableData) {
        console.error('Failed to fetch timetable data');
        return null;
    }

    const elements = timetableData.elements;
    const filteredData = {
        classes: elements.filter(item => item.type === 1),
        teachers: elements.filter(item => item.type === 2),
        lessons: elements.filter(item => item.type === 3),
        rooms: elements.filter(item => item.type === 4)
    };

    return { filteredData, dataElementPeriods: timetableData.elementPeriods[personId] };
}

async function run(startDate) {
    try {
        const result = await processData(startDate);
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

module.exports = { run };
