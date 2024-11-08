const ical = require('ical-generator').default || require('ical-generator');
const { add, format, addDays, isBefore } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');
const { run } = require('../../run.js');

const CEST_TIMEZONE = 'Europe/Vienna';

export async function handler(event, context) {
    try {
        const calendar = ical({ name: 'Stundenplan' });
        const startDate = new Date(); // Start from today's date
        const endDate = add(startDate, { years: 1 }); // Until one year from today
        let currentDate = startDate;

        // Function to add events from a specific week's timetable
        const addEventsToCalendar = (timetable) => {
            Object.values(timetable).forEach(day => {
                day.forEach(event => {
                    if (event.cellState !== "CANCEL" && !event.isFreePeriod) {
                        const start = zonedTimeToUtc(`${event.date} ${event.startTime}`, CEST_TIMEZONE);
                        const end = zonedTimeToUtc(`${event.date} ${event.endTime}`, CEST_TIMEZONE);

                        calendar.createEvent({
                            start,
                            end,
                            summary: event.subject_short,
                            description: `${event.subject_long}, Room: ${event.room}, Teacher: ${event.teacherName}`,
                            color: event.color || undefined,
                            timezone: CEST_TIMEZONE,
                        });
                    }
                });
            });
        };

        // Loop through each day for the next year and fetch timetables
        while (isBefore(currentDate, endDate)) {
            const formattedDate = format(currentDate, 'yyyy-MM-dd');
            const nextWeekDate = format(add(currentDate, { weeks: 1 }), 'yyyy-MM-dd');

            // Fetch timetable data for current day and the next week
            const timetableThisWeek = await run(formattedDate);
            const timetableNextWeek = await run(nextWeekDate);

            // Add events to the calendar if data is available
            if (timetableThisWeek) addEventsToCalendar(timetableThisWeek);
            if (timetableNextWeek) addEventsToCalendar(timetableNextWeek);

            // Move to the next day
            currentDate = addDays(currentDate, 1);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename="school-timetable.ics"',
            },
            body: calendar.toString(),
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify(error.message) };
    }
}
