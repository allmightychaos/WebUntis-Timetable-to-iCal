// src/core/utils.js

function createElementMap(elements, key = "name", altKey = null) {
    const map = {};
    elements.forEach((el) => {
        map[el.id] = {
            [key]: el[key],
            ...(altKey ? { [altKey]: el[altKey] } : {}),
        };
    });
    return map;
}

function formatTime(time) {
    return time
        .toString()
        .padStart(4, "0")
        .replace(/(\d{2})(\d{2})/, "$1:$2");
}

function formatDate(date) {
    const dateStr = date.toString();
    return dateStr.length === 8
        ? `${dateStr.slice(6, 8)}.${dateStr.slice(4, 6)}.${dateStr.slice(0, 4)}`
        : "Invalid Date";
}

function capitalizeFirstLetter(string) {
    return string
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getColorByCellState(cellState) {
    const colors = {
        STANDARD: "#B4F8B4",
        CANCEL: "#C5C6C6",
        SHIFT: "#B5A0C1",
        EXAM: "#F5F1C1",
        SUBSTITUTION: "#B79CC4",
    };
    return colors[cellState] || null;
}

// --- School year helpers (Austria style: starts early Sept, ends early July) ---
function firstMondayOfSeptember(year) {
    const sept1 = new Date(year, 8, 1); // Sept = 8
    const day = sept1.getDay(); // 0=Sun ... 1=Mon
    const offset = (8 - day) % 7; // days until Monday
    return new Date(year, 8, 1 + offset);
}

// End of the school year is always July 7 of the target school-year end year.
// If we're already in/after September, the current school year ends next year's July 7.
function getSchoolYearEnd(refDate = new Date()) {
    const yearEndYear =
        refDate.getMonth() >= 8
            ? refDate.getFullYear() + 1
            : refDate.getFullYear();
    return new Date(yearEndYear, 6, 7); // July 7
}

// Next school year start: first Monday of September of the upcoming school year boundary.
// If today is before the September start, return that; otherwise the September of next year.
function getNextSchoolYearStart(refDate = new Date()) {
    const year = refDate.getFullYear();
    const thisYearStart = firstMondayOfSeptember(year);
    if (refDate < thisYearStart) return thisYearStart; // not started yet
    return firstMondayOfSeptember(year + 1);
}

function isSummerBreak(date) {
    const year = date.getFullYear();
    const summerStart = new Date(year, 6, 7); // July 7 current year
    const nextStart = firstMondayOfSeptember(year);
    return date >= summerStart && date < nextStart;
}

function getRemainingSchoolWeeks(startDate) {
    const start = new Date(startDate);
    // Determine proper year-end relative to the start date
    const schoolYearEnd = getSchoolYearEnd(start);

    if (start >= schoolYearEnd) {
        return 0; // after school year end (i.e. summer, handled earlier)
    }

    const diffTime = schoolYearEnd - start; // ms
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
}

module.exports = {
    createElementMap,
    formatTime,
    formatDate,
    capitalizeFirstLetter,
    getColorByCellState,
    getSchoolYearEnd,
    getNextSchoolYearStart,
    isSummerBreak,
    getRemainingSchoolWeeks,
};
