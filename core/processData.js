// src/core/processData.js
import { createElementMap, formatDate, formatTime, capitalizeFirstLetter, getColorByCellState } from './utils.js';


async function processTimetableData(dataElementPeriods, filteredData) {
      const { teachers, lessons, rooms } = filteredData;

      // Create maps for O(1) lookups by id
      const teachersMap = createElementMap(teachers);
      const roomsMap = createElementMap(rooms);
      const lessonsMap = createElementMap(lessons, 'name', 'longName');

      return dataElementPeriods.map(period => ({
            id: period.id,
            lessonId: period.lessonId,
            periodText: period.hasPeriodText ? period.periodText : undefined,
            date: formatDate(period.date),
            startTime: formatTime(period.startTime),
            endTime: formatTime(period.endTime),
            cellState: period.cellState,
            teacherName: teachersMap[period.elements.find(e => e.type === 2)?.id]?.name || '',
            room: roomsMap[period.elements.find(e => e.type === 4)?.id]?.name || '',
            subject_short: lessonsMap[period.elements.find(e => e.type === 3)?.id]?.name || '',
            subject_long: capitalizeFirstLetter(lessonsMap[period.elements.find(e => e.type === 3)?.id]?.longName || ''),
            color: getColorByCellState(period.cellState)
      }));
}

function groupAndSortTimetable(timetable) {
      const grouped = timetable.reduce((acc, entry) => {
            if (entry.subject_short.includes('EBC') || entry.subject_long.includes('EBC')) {
                  return acc;
            }

            (acc[entry.date] = acc[entry.date] || []).push(entry);
            return acc;
      }, {});

      Object.values(grouped).forEach(group => group.sort((a, b) => a.startTime.localeCompare(b.startTime)));

      return Object.keys(grouped)
            .sort((a, b) => new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-')))
            .reduce((acc, date) => ({ ...acc, [date]: grouped[date] }), {});
}


function insertFreePeriods(groupedTimetable) {
      const MAX_BREAK_DURATION = 15;
      const updatedTimetable = {};

      for (const [date, entries] of Object.entries(groupedTimetable)) {
            let previousEndTime = null;
            updatedTimetable[date] = [];

            entries.forEach(entry => {
                  const entryStartTime = timeToMinutes(entry.startTime);

                  if (previousEndTime !== null && entryStartTime - previousEndTime >= MAX_BREAK_DURATION) {
                        updatedTimetable[date].push({
                              date: entry.date,
                              startTime: minutesToTime(previousEndTime),
                              endTime: minutesToTime(entryStartTime),
                              isFreePeriod: true
                        });
                  }

                  updatedTimetable[date].push(entry);
                  previousEndTime = timeToMinutes(entry.endTime);
            });
      }

      return updatedTimetable;
}

function timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
}

function minutesToTime(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export {
      processTimetableData,
      groupAndSortTimetable,
      insertFreePeriods
};
