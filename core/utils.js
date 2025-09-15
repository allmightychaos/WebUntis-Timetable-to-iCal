// src/core/utils.js

function createElementMap(arr, key = "name", altKey = null) {
    const map = {};
    for (const el of arr)
        map[el.id] = {
            [key]: el[key],
            ...(altKey ? { [altKey]: el[altKey] } : {}),
        };
    return map;
}
function formatTime(t) {
    return t
        .toString()
        .padStart(4, "0")
        .replace(/(\d{2})(\d{2})/, "$1:$2");
}
function formatDate(d) {
    const s = d.toString();
    return s.length === 8
        ? `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`
        : "Invalid Date";
}
function capitalizeFirstLetter(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}
function getColorByCellState(s) {
    return (
        {
            STANDARD: "#B4F8B4",
            CANCEL: "#C5C6C6",
            SHIFT: "#B5A0C1",
            EXAM: "#F5F1C1",
            SUBSTITUTION: "#B79CC4",
        }[s] || null
    );
}

function firstMondayOfSeptember(y) {
    const d = new Date(y, 8, 1);
    const off = (8 - d.getDay()) % 7;
    return new Date(y, 8, 1 + off);
} // school year start
function getSchoolYearEnd(ref = new Date()) {
    const endYear =
        ref.getMonth() >= 8 ? ref.getFullYear() + 1 : ref.getFullYear();
    return new Date(endYear, 6, 7);
} // July 7
function getNextSchoolYearStart(ref = new Date()) {
    const y = ref.getFullYear();
    const thisStart = firstMondayOfSeptember(y);
    return ref < thisStart ? thisStart : firstMondayOfSeptember(y + 1);
}
function isSummerBreak(date) {
    const y = date.getFullYear();
    const summerStart = new Date(y, 6, 7);
    const nextStart = firstMondayOfSeptember(y);
    return date >= summerStart && date < nextStart;
}
function getRemainingSchoolWeeks(start) {
    const s = new Date(start);
    const end = getSchoolYearEnd(s);
    if (s >= end) return 0;
    return Math.ceil((end - s) / (1000 * 60 * 60 * 24 * 7));
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
