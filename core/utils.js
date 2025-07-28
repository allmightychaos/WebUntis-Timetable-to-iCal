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

function getSchoolYearEnd() {
    const currentYear = new Date().getFullYear();
    // School year ends in July
    return new Date(currentYear, 6, 7); // July 7th
}

function getNextSchoolYearStart() {
    const currentYear = new Date().getFullYear();
    // Find first Monday of September
    const september = new Date(currentYear, 8, 1); // September 1st
    const dayOfWeek = september.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7; // 0 if already Monday
    return new Date(currentYear, 8, 1 + daysUntilMonday);
}

function isSummerBreak(date) {
    const schoolYearEnd = getSchoolYearEnd();
    const nextYearStart = getNextSchoolYearStart();
    return date >= schoolYearEnd && date < nextYearStart;
}

function getRemainingSchoolWeeks(startDate) {
    const schoolYearEnd = getSchoolYearEnd();
    const start = new Date(startDate);

    if (start >= schoolYearEnd) {
        return 0;
    }

    const diffTime = Math.abs(schoolYearEnd - start);
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
