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

// Cache for detail responses within a single run
const detailCache = new Map(); // key => detail object or null

function buildCacheKey(entry) {
    return [
        entry.date,
        entry.startTime,
        entry.endTime,
        entry.lessonId || entry.id,
    ].join("|");
}

function dottedToIso(dateStr) {
    const [d, m, y] = dateStr.split(".").map(Number);
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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
    const cacheKey = buildCacheKey(entry);
    if (detailCache.has(cacheKey)) return detailCache.get(cacheKey);

    const iso = dottedToIso(entry.date);
    const start = `${iso}T${entry.startTime}:00`;
    const end = `${iso}T${entry.endTime}:00`;

    const attempts = [];
    if (bearer) {
        attempts.push({
            url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${personId}&elementType=5&endDateTime=${encodeURIComponent(
                end
            )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(start)}`,
            label: "bearer-student",
        });
        attempts.push({
            url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${
                entry.lessonId || entry.id
            }&elementType=3&endDateTime=${encodeURIComponent(
                end
            )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(start)}`,
            label: "bearer-lesson",
        });
    }
    attempts.push({
        url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${personId}&elementType=5&endDateTime=${encodeURIComponent(
            end
        )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(start)}`,
        label: "cookie-student",
    });
    attempts.push({
        url: `https://${host}/WebUntis/api/rest/view/v2/calendar-entry/detail?elementId=${
            entry.lessonId || entry.id
        }&elementType=3&endDateTime=${encodeURIComponent(
            end
        )}&homeworkOption=DUE&startDateTime=${encodeURIComponent(start)}`,
        label: "cookie-lesson",
    });

    for (const att of attempts) {
        try {
            const headers = { "User-Agent": "Mozilla/5.0" };
            if (att.label.startsWith("bearer") && bearer) {
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
            const resp = await axios.get(att.url, {
                validateStatus: () => true,
                headers,
            });
            if (resp.status === 200 && resp.data?.calendarEntries?.length) {
                const data = resp.data.calendarEntries[0];
                detailCache.set(cacheKey, data);
                return data;
            }
            if (resp.status === 401 && att.label.startsWith("bearer")) {
                // Bearer invalid -> let caller attempt refresh by returning special marker.
                detailCache.set(cacheKey, { __unauthorized: true });
                return { __unauthorized: true };
            }
        } catch (_) {
            // swallow; try next
        }
    }
    detailCache.set(cacheKey, null);
    return null;
}

async function obtainBearerOnce(context) {
    if (context.bearer) return context; // already have
    // Try token/new via session first
    const sessToken = await getRestBearerFromSession(
        context.domain,
        context.school,
        context.sessionId
    );
    if (sessToken?.token) {
        context.bearer = sessToken.token;
        context.host = sessToken.host;
        if (!context.schoolYearId) {
            const sy = await fetchAppConfigForYear(
                sessToken.host,
                context.sessionId,
                context.school
            );
            if (sy) context.schoolYearId = sy;
        }
        return context;
    }
    // Fallback: legacy REST login endpoints (needs credentials)
    const legacy = await getRestBearer(
        context.domain,
        context.school,
        context.username,
        context.password
    );
    if (legacy?.token) {
        context.bearer = legacy.token;
        context.host = legacy.host;
        if (!context.schoolYearId && legacy.schoolYearId)
            context.schoolYearId = legacy.schoolYearId;
    }
    return context;
}

async function enrichTeachers(lessons, opts) {
    const {
        sessionId,
        personId,
        domain,
        school,
        username,
        password,
        tenantId: initialTenantId,
        schoolYearId: initialSchoolYearId,
        maxDetails = 60,
        verbose = false,
    } = opts;

    if (!lessons?.length) return { attempted: 0, enriched: 0 };

    const host = await resolveWebUntisHost(domain);
    const context = {
        bearer: process.env.WEBUNTIS_BEARER || "",
        host,
        domain,
        school,
        username,
        password,
        sessionId,
        schoolYearId:
            initialSchoolYearId || process.env.WEBUNTIS_SCHOOL_YEAR_ID || "",
        tenantId: initialTenantId || process.env.WEBUNTIS_TENANT_ID || "",
    };

    // Acquire bearer only if missing
    if (!context.bearer) await obtainBearerOnce(context);

    const targets = lessons.filter((l) => !l.teacherName);
    if (!targets.length) return { attempted: 0, enriched: 0, skipped: true };

    let attempted = 0;
    let enriched = 0;

    for (const entry of targets) {
        if (attempted >= maxDetails) break;
        attempted++;
        let detail = await fetchDetail({
            host: context.host,
            bearer: context.bearer,
            personId,
            sessionId,
            school,
            entry,
            tenantId: context.tenantId,
            schoolYearId: context.schoolYearId,
        });
        if (detail && detail.__unauthorized) {
            // refresh bearer and retry once
            context.bearer = "";
            await obtainBearerOnce(context);
            detail = await fetchDetail({
                host: context.host,
                bearer: context.bearer,
                personId,
                sessionId,
                school,
                entry,
                tenantId: context.tenantId,
                schoolYearId: context.schoolYearId,
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
