const {
    createElementMap,
    formatDate,
    formatTime,
    capitalizeFirstLetter,
} = require("./utils.js");

async function processTimetableData(dataElementPeriods, filteredData) {
    const { teachers, lessons, rooms } = filteredData;
    const teachersMap = createElementMap(teachers);
    const roomsMap = createElementMap(rooms);
    const lessonsMap = createElementMap(lessons, "name", "longName");

    return dataElementPeriods.map((p) => ({
        id: p.id,
        lessonId: p.lessonId,
        periodText: p.hasPeriodText ? p.periodText : undefined,
        date: formatDate(p.date),
        startTime: formatTime(p.startTime),
        endTime: formatTime(p.endTime),
        cellState: p.cellState,
        teacherName:
            teachersMap[p.elements.find((e) => e.type === 2)?.id]?.name || "",
        room: roomsMap[p.elements.find((e) => e.type === 4)?.id]?.name || "",
        subject_short:
            lessonsMap[p.elements.find((e) => e.type === 3)?.id]?.name || "",
        subject_long: capitalizeFirstLetter(
            lessonsMap[p.elements.find((e) => e.type === 3)?.id]?.longName || ""
        ),
    }));
}

function groupAndSortTimetable(timetable) {
    const grouped = timetable.reduce((acc, e) => {
        if (e.subject_short.includes("EBC") || e.subject_long.includes("EBC"))
            return acc;
        (acc[e.date] = acc[e.date] || []).push(e);
        return acc;
    }, {});
    Object.values(grouped).forEach((g) =>
        g.sort((a, b) => a.startTime.localeCompare(b.startTime))
    );
    return Object.keys(grouped)
        .sort(
            (a, b) =>
                new Date(a.split(".").reverse().join("-")) -
                new Date(b.split(".").reverse().join("-"))
        )
        .reduce((acc, d) => ({ ...acc, [d]: grouped[d] }), {});
}

function insertFreePeriods(grouped) {
    const MAX_BREAK = 15;
    const out = {};
    for (const [date, list] of Object.entries(grouped)) {
        let prevEnd = null;
        out[date] = [];
        list.forEach((e) => {
            const start = toMin(e.startTime);
            if (prevEnd !== null && start - prevEnd >= MAX_BREAK) {
                out[date].push({
                    date: e.date,
                    startTime: fromMin(prevEnd),
                    endTime: fromMin(start),
                    isFreePeriod: true,
                });
            }
            out[date].push(e);
            prevEnd = toMin(e.endTime);
        });
    }
    return out;
}

const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};
const fromMin = (m) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

module.exports = {
    processTimetableData,
    groupAndSortTimetable,
    insertFreePeriods,
};
