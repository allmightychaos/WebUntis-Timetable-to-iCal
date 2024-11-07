// netlify/functions/generateTimetableIcal.js
import ical from 'ical-generator';
import { parse } from 'date-fns';
import { run } from '../../run.js';

export async function handler(event, context) {
    try {
        // Call the run function to get finalTimetable
        const finalTimetable = await run();
        
        if (!finalTimetable) {
            return { statusCode: 500, body: 'Failed to generate timetable' };
        }

        // Create a new iCal calendar
        const calendar = ical({ name: 'School Timetable' });

        // Populate calendar with events from finalTimetable
        Object.values(finalTimetable).forEach(day => {
            day.forEach(event => {
                if (event.cellState !== "CANCEL" && !event.isFreePeriod) {
                    calendar.createEvent({
                        start: parse(`${event.date} ${event.startTime}`, 'dd.MM.yyyy HH:mm', new Date()),
                        end: parse(`${event.date} ${event.endTime}`, 'dd.MM.yyyy HH:mm', new Date()),
                        summary: event.subject_short,
                        description: `${event.subject_long}, Room: ${event.room}, Teacher: ${event.teacherName}`,
                        color: event.color || undefined,  // Only include color if it's supported
                    });
                }
            });
        });

        // Return the generated iCal file as a response
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
