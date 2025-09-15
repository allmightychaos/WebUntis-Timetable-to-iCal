// core/teacherEnrichment.js
// Teacher enrichment: fetch missing teacher names via WebUntis REST detail endpoint.
// Designed to be invoked after processTimetableData (flat lesson array) and before grouping.

const axios = require("axios");
const { resolveWebUntisHost } = require("./domain");
const {
    getRestBearerFromSession,
    fetchAppConfigForYear,
    getRestBearer,
} = require("./webuntisRestAuth");

const detailCache = new Map(); // per-run cache
const key = (e) =>
    [e.date, e.startTime, e.endTime, e.lessonId || e.id].join("|");
const dottedToIso = (d) => {
    const [dd, mm, yy] = d.split(".").map(Number);
    return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
        2,
        "0"
    )}`;
};

async function fetchDetail({
    host,
    bearer,
    personId,
    sessionId,
    school,
    entry,
    tenantId,
    schoolYearId,
}) {
    const k = key(entry);
    if (detailCache.has(k)) return detailCache.get(k);
    const iso = dottedToIso(entry.date);
    const start = `${iso}T${entry.startTime}:00`;
    const end = `${iso}T${entry.endTime}:00`;

    const queries = [];
    if (bearer) {
        for (const t of [
            { elementId: personId, type: 5, tag: "student" },
            { elementId: entry.lessonId || entry.id, type: 3, tag: "lesson" },
        ]) {
            queries.push({
                label: `bearer-${t.tag}`,
                url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${
                    t.elementId
                }&elementType=${t.type}&endDateTime=${encodeURIComponent(
                    end
                )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(
                    start
                )}`,
            });
        }
    }
    for (const t of [
        { elementId: personId, type: 5, tag: "student" },
        { elementId: entry.lessonId || entry.id, type: 3, tag: "lesson" },
    ]) {
        queries.push({
            label: `cookie-${t.tag}`,
            url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${
                t.elementId
            }&elementType=${t.type}&endDateTime=${encodeURIComponent(
                end
            )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(start)}`,
        });
    }

    for (const q of queries) {
        try {
            const headers = { "User-Agent": "Mozilla/5.0" };
            if (q.label.startsWith("bearer") && bearer) {
                headers.Authorization = `Bearer ${bearer}`;
                if (tenantId) headers["Tenant-Id"] = tenantId;
                if (schoolYearId)
                    headers["X-Webuntis-Api-School-Year-Id"] = schoolYearId;
            } else {
                const encodedSchool = `_${Buffer.from(school).toString(
                    "base64"
                )}`;
                headers.Cookie = `JSESSIONID=${sessionId}; schoolname="${encodedSchool}";`;
                if (tenantId) headers["Tenant-Id"] = tenantId;
                if (schoolYearId)
                    headers["X-Webuntis-Api-School-Year-Id"] = schoolYearId;
            }
            const resp = await axios.get(q.url, {
                validateStatus: () => true,
                headers,
            });
            if (resp.status === 200 && resp.data?.calendarEntries?.length) {
                const data = resp.data.calendarEntries[0];
                detailCache.set(k, data);
                return data;
            }
            if (resp.status === 401 && q.label.startsWith("bearer")) {
                detailCache.set(k, { __unauthorized: true });
                return { __unauthorized: true };
            }
        } catch (_) {
            /* ignore */
        }
    }
    detailCache.set(k, null);
    return null;
}

async function obtainBearerOnce(ctx) {
    if (ctx.bearer) return ctx;
    const sess = await getRestBearerFromSession(
        ctx.domain,
        ctx.school,
        ctx.sessionId
    );
    if (sess?.token) {
        ctx.bearer = sess.token;
        ctx.host = sess.host;
        if (!ctx.schoolYearId) {
            const sy = await fetchAppConfigForYear(
                sess.host,
                ctx.sessionId,
                ctx.school
            );
            if (sy) ctx.schoolYearId = sy;
        }
        return ctx;
    }
    const legacy = await getRestBearer(
        ctx.domain,
        ctx.school,
        ctx.username,
        ctx.password
    );
    if (legacy?.token) {
        ctx.bearer = legacy.token;
        ctx.host = legacy.host;
        if (!ctx.schoolYearId && legacy.schoolYearId)
            ctx.schoolYearId = legacy.schoolYearId;
    }
    return ctx;
}

async function enrichTeachers(lessons, opts) {
    const {
        sessionId,
        personId,
        domain,
        school,
        username,
        password,
        tenantId,
        schoolYearId,
        maxDetails = 60,
    } = opts;
    if (!lessons?.length) return { attempted: 0, enriched: 0 };
    const host = await resolveWebUntisHost(domain);
    const ctx = {
        bearer: process.env.WEBUNTIS_BEARER || "",
        host,
        domain,
        school,
        username,
        password,
        sessionId,
        schoolYearId: schoolYearId || process.env.WEBUNTIS_SCHOOL_YEAR_ID || "",
        tenantId: tenantId || process.env.WEBUNTIS_TENANT_ID || "",
    };
    if (!ctx.bearer) await obtainBearerOnce(ctx);
    const targets = lessons.filter((l) => !l.teacherName);
    if (!targets.length) return { attempted: 0, enriched: 0, skipped: true };

    let attempted = 0,
        enriched = 0;
    for (const entry of targets) {
        if (attempted >= maxDetails) break;
        attempted++;
        let detail = await fetchDetail({
            host: ctx.host,
            bearer: ctx.bearer,
            personId,
            sessionId,
            school,
            entry,
            tenantId: ctx.tenantId,
            schoolYearId: ctx.schoolYearId,
        });
        if (detail && detail.__unauthorized) {
            ctx.bearer = "";
            await obtainBearerOnce(ctx);
            detail = await fetchDetail({
                host: ctx.host,
                bearer: ctx.bearer,
                personId,
                sessionId,
                school,
                entry,
                tenantId: ctx.tenantId,
                schoolYearId: ctx.schoolYearId,
            });
        }
        if (detail?.teachers?.length) {
            entry.teacherName =
                detail.teachers[0].longName ||
                detail.teachers[0].shortName ||
                detail.teachers[0].displayName ||
                entry.teacherName ||
                "";
            if (entry.teacherName) enriched++;
        }
    }
    return { attempted, enriched, totalMissing: targets.length };
}

module.exports = { enrichTeachers };
