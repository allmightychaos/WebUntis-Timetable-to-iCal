// tests/08-detail-fallback.js
// Experimental: fetch weekly timetable, detect missing teacher and enrich via REST detail endpoint.
require("dotenv").config();
const { format, startOfWeek } = require("date-fns");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { login } = require("../core/webuntisAuth");
const {
    getRestBearer,
    getRestBearerFromSession,
    fetchAppConfigForYear,
} = require("../core/webuntisRestAuth");
const { fetchTimetableData } = require("../core/webuntisFetch");
const { resolveWebUntisHost } = require("../core/domain");
const {
    processTimetableData,
    groupAndSortTimetable,
    insertFreePeriods,
} = require("../core/timetableProcessor");
const { getDefaultAccount } = require("../core/multiAccounts");

// --- Config via ENV ---
// DETAIL_MAX (optional) – limit how many detail calls (default 40)
// DETAIL_VERBOSE (optional) – set to truthy to log each attempt

const MAX_DETAIL_CALLS = parseInt(process.env.DETAIL_MAX || "40", 10);
const VERBOSE = !!process.env.DETAIL_VERBOSE;

// Simple in-memory cache to avoid hammering the detail endpoint repeatedly for identical periods
const detailCache = new Map(); // key: date|start|end|lessonId

function buildCacheKey(entry) {
    return [
        entry.date,
        entry.startTime,
        entry.endTime,
        entry.lessonId || entry.id,
    ].join("|");
}

function ddmmyyyyToIso(dateStr) {
    const [d, m, y] = dateStr.split(".").map(Number);
    return `${y}-${m.toString().padStart(2, "0")}-${d
        .toString()
        .padStart(2, "0")}`;
}

// Removed rooms/form helper: room enrichment intentionally disabled.

async function fetchDetail({
    host,
    bearer,
    tenantId,
    schoolYearId,
    personId,
    sessionId,
    school,
    entry,
}) {
    const cacheKey = buildCacheKey(entry);
    if (detailCache.has(cacheKey)) return detailCache.get(cacheKey);

    const iso = ddmmyyyyToIso(entry.date);
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
                headers.Cookie = `JSESSIONID=${sessionId}; schoolname="_${school}";${
                    tenantId ? ` Tenant-Id="${tenantId}";` : ""
                }`;
                if (tenantId) headers["Tenant-Id"] = tenantId;
                if (schoolYearId)
                    headers["X-Webuntis-Api-School-Year-Id"] = schoolYearId;
            }
            const resp = await axios.get(att.url, {
                headers,
                validateStatus: () => true,
            });
            if (VERBOSE)
                console.error(
                    `[detail] ${att.label} status=${resp.status} key=${cacheKey}`
                );
            if (resp.status === 200) {
                const data = resp.data?.calendarEntries?.[0];
                if (data) {
                    detailCache.set(cacheKey, data);
                    return data;
                }
            } else if (resp.status === 401 && att.label.startsWith("bearer")) {
                continue;
            }
        } catch (e) {
            if (VERBOSE)
                console.error(
                    `[detail] error ${att.label}:`,
                    e.response?.status,
                    e.message
                );
        }
    }

    detailCache.set(cacheKey, null);
    return null;
}

(async () => {
    try {
        const acct = getDefaultAccount();
        if (!acct)
            throw new Error("No default account (WEBUNTIS_ACCOUNTS empty)");
        const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekDate = format(monday, "yyyy-MM-dd");

        const { domain, school, username, password } = acct;

        const loginRes = await login(domain, school, username, password);
        if (!loginRes) throw new Error("Login failed");
        const { sessionId, personId, personType } = loginRes;

        let bearer = process.env.WEBUNTIS_BEARER || "";
        let tenantId = process.env.WEBUNTIS_TENANT_ID || "";
        let schoolYearId = process.env.WEBUNTIS_SCHOOL_YEAR_ID || "";
        if (!bearer) {
            const sessToken = await getRestBearerFromSession(
                domain,
                school,
                sessionId
            );
            if (sessToken && sessToken.token) {
                bearer = sessToken.token;
                if (!schoolYearId) {
                    const sy = await fetchAppConfigForYear(
                        sessToken.host,
                        sessionId,
                        school
                    );
                    if (sy) schoolYearId = sy;
                }
                if (VERBOSE)
                    console.error(
                        `[rest-auth] acquired bearer via token/new exp=${
                            sessToken.exp || "n/a"
                        }`
                    );
            }
        }
        if (!bearer) {
            const restAuth = await getRestBearer(
                domain,
                school,
                username,
                password
            );
            if (restAuth && restAuth.token) {
                bearer = restAuth.token;
                if (!tenantId && restAuth.tenantId)
                    tenantId = restAuth.tenantId;
                if (!schoolYearId && restAuth.schoolYearId)
                    schoolYearId = restAuth.schoolYearId;
                if (VERBOSE)
                    console.error(
                        `[rest-auth] acquired bearer from ${restAuth.endpoint}`
                    );
            } else if (VERBOSE) {
                console.error(
                    "[rest-auth] failed to obtain bearer token via login endpoints"
                );
            }
        }
        if (!bearer && !VERBOSE)
            console.error(
                "[info] No bearer token available (env or auto). Detail enrichment may fail."
            );

        const raw = await fetchTimetableData(
            sessionId,
            personType,
            personId,
            weekDate,
            domain
        );
        if (!raw) throw new Error("Weekly fetch failed");

        const elems = raw.elements;
        const filtered = {
            classes: elems.filter((e) => e.type === 1),
            teachers: elems.filter((e) => e.type === 2),
            lessons: elems.filter((e) => e.type === 3),
            rooms: elems.filter((e) => e.type === 4),
        };

        const processed = await processTimetableData(
            raw.elementPeriods[personId],
            filtered
        );
        const grouped = groupAndSortTimetable(processed);
        const timetable = insertFreePeriods(grouped);

        const host = await resolveWebUntisHost(domain);

        // Collect candidates needing teacher enrichment only.
        const candidates = [];
        for (const day of Object.keys(timetable)) {
            for (const entry of timetable[day]) {
                if (entry.isFreePeriod) continue;
                if (!entry.teacherName) candidates.push(entry);
            }
        }

        let attempts = 0;
        let enriched = 0;
        for (const entry of candidates) {
            if (attempts >= MAX_DETAIL_CALLS) break;
            attempts++;
            const detail = await fetchDetail({
                host,
                bearer,
                tenantId,
                schoolYearId,
                personId,
                sessionId,
                school,
                entry,
            });
            let changed = false;
            if (detail) {
                if (!entry.teacherName && detail.teachers?.length) {
                    entry.teacherName =
                        detail.teachers[0].longName ||
                        detail.teachers[0].shortName ||
                        detail.teachers[0].displayName ||
                        entry.teacherName;
                    changed = true;
                }
            }
            if (changed) enriched++;
        }

        // Prepare compact enrichment output for later integration.
        const teacherMap = {};
        for (const day of Object.keys(timetable)) {
            for (const entry of timetable[day]) {
                if (entry.isFreePeriod) continue;
                if (entry.teacherName) {
                    teacherMap[entry.id] = {
                        lessonId: entry.lessonId,
                        date: entry.date,
                        start: entry.startTime,
                        end: entry.endTime,
                        teacherName: entry.teacherName,
                    };
                }
            }
        }

        const outDir = path.join(__dirname, "output");
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(
            outDir,
            `detail-enriched-week-${weekDate}.json`
        );
        const filePayload = {
            weekStart: weekDate,
            generatedAt: new Date().toISOString(),
            personId,
            teacherCount: Object.keys(teacherMap).length,
            teachers: teacherMap,
        };
        fs.writeFileSync(outFile, JSON.stringify(filePayload, null, 2), "utf8");

        console.log(
            JSON.stringify(
                {
                    weekStart: weekDate,
                    candidates: candidates.length,
                    attempts,
                    enriched,
                    bearerPresent: !!bearer,
                    outputFile: path.relative(process.cwd(), outFile),
                },
                null,
                2
            )
        );
    } catch (e) {
        console.error("Detail fallback test failed:", e.message);
        process.exit(1);
    }
})();
