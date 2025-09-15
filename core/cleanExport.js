// Build cleaned JSON similar to tests output
function buildClean(grouped) {
    const days = Object.keys(grouped)
        .sort((a, b) => {
            const [da, ma, ya] = a.split(".").map(Number);
            const [db, mb, yb] = b.split(".").map(Number);
            return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
        })
        .map((d) => {
            const entries = grouped[d];
            const lessons = [];
            const freePeriods = [];
            for (const e of entries) {
                if (e.isFreePeriod) {
                    freePeriods.push({ start: e.startTime, end: e.endTime });
                    continue;
                }
                if (e.cellState === "CANCEL") continue;
                lessons.push({
                    id: e.id,
                    lessonId: e.lessonId || undefined,
                    subject: e.subject_short || undefined,
                    subject_long: e.subject_long || undefined,
                    teacher: e.teacherName || undefined,
                    room: e.room || undefined,
                    start: e.startTime,
                    end: e.endTime,
                    state: e.cellState,
                    periodText: e.periodText || undefined,
                    color: e.color || undefined,
                });
            }
            return {
                date: d.split(".").reverse().join("-"),
                lessons,
                freePeriods,
            };
        });
    return { generatedAt: new Date().toISOString(), days };
}
module.exports = { buildClean };
