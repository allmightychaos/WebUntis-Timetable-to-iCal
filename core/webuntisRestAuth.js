// core/webuntisRestAuth.js
// Attempt to obtain a REST Bearer token for the newer WebUntis REST endpoints.
// This is heuristic: different tenants / versions may expose different login endpoints.
// We try several variants and payload shapes.

const axios = require("axios");
const { resolveWebUntisHost } = require("./domain");

async function tryPost(url, payload, extraHeaders = {}) {
    try {
        const resp = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0",
                ...extraHeaders,
            },
            validateStatus: () => true,
        });
        return resp;
    } catch (e) {
        return { status: 0, error: e }; // network / other failure
    }
}

function extractTokenStructure(data) {
    if (!data) return null;
    // Possible shapes:
    // { token: "..", person: {...}, tenantId: "..", schoolYearId: 17 }
    // { data: { token: ".." } }
    // { bearer: ".." }
    if (data.token) return data;
    if (data.bearer) return { token: data.bearer, ...data };
    if (data.data && data.data.token) return data.data;
    return null;
}

function decodeJwt(token) {
    try {
        const [, payload] = token.split(".");
        const json = Buffer.from(payload, "base64").toString("utf8");
        return JSON.parse(json);
    } catch (_) {
        return null;
    }
}

async function getRestBearer(domain, school, username, password) {
    const host = await resolveWebUntisHost(domain);

    const base = `https://${host}`;
    // Attempt endpoints (order matters)
    const endpoints = [
        `${base}/WebUntis/api/rest/auth/login`,
        `${base}/WebUntis/api/rest/view/v1/login`,
        `${base}/WebUntis/api/rest/authenticate/user`,
    ];

    // Different payload variants (key names sometimes differ)
    const payloads = [
        { user: username, password, client: "client" },
        { username, password },
    ];

    // Some instances require the school param in query.
    const querySuffix = `?school=${encodeURIComponent(school)}`;

    for (const ep of endpoints) {
        for (const body of payloads) {
            for (const suffix of ["", querySuffix]) {
                const url = ep + suffix;
                const resp = await tryPost(url, body);
                if (resp.status === 200 && resp.data) {
                    const maybe = extractTokenStructure(resp.data);
                    if (maybe && maybe.token) {
                        return {
                            host,
                            token: maybe.token,
                            tenantId: maybe.tenantId || maybe.tenant_id || null,
                            schoolYearId:
                                maybe.schoolYearId ||
                                maybe.school_year_id ||
                                null,
                            raw: resp.data,
                            endpoint: url,
                            method: "login-endpoint",
                        };
                    }
                }
                // 401/403 -> continue; other 5xx also continue
            }
        }
    }

    return null; // failed
}

// NEW: obtain token using existing JSON-RPC session via /WebUntis/api/token/new
// Requires JSESSIONID cookie (and usually schoolname + Tenant-Id). Returns raw JWT only (no JSON wrapper).
async function getRestBearerFromSession(domain, school, sessionId) {
    if (!sessionId) return null;
    const host = await resolveWebUntisHost(domain);
    const base = `https://${host}`;
    const encodedSchool = `_${Buffer.from(school).toString("base64")}`; // matches observed cookie style

    try {
        const resp = await axios.get(`${base}/WebUntis/api/token/new`, {
            headers: {
                Accept: "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0",
                Referer: `${base}/`,
                Cookie: `JSESSIONID=${sessionId}; schoolname="${encodedSchool}";`,
            },
            validateStatus: () => true,
        });
        if (
            resp.status === 200 &&
            typeof resp.data === "string" &&
            resp.data.split(".").length === 3
        ) {
            const jwtPayload = decodeJwt(resp.data) || {};
            return {
                host,
                token: resp.data,
                tenantId: jwtPayload.tenant_id || jwtPayload.tenantId || null,
                schoolYearId: jwtPayload.schoolYearId || null, // often missing here
                raw: jwtPayload,
                endpoint: `${base}/WebUntis/api/token/new`,
                method: "session-token-new",
                exp: jwtPayload.exp || null,
            };
        }
    } catch (e) {
        // ignore
    }
    return null;
}

// Attempt to enrich with schoolYearId if missing via /WebUntis/api/app/config
async function fetchAppConfigForYear(host, sessionId, school) {
    try {
        const encodedSchool = `_${Buffer.from(school).toString("base64")}`;
        const resp = await axios.get(
            `https://${host}/WebUntis/api/app/config`,
            {
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "User-Agent": "Mozilla/5.0",
                    Cookie: `JSESSIONID=${sessionId}; schoolname="${encodedSchool}";`,
                },
                validateStatus: () => true,
            }
        );
        if (resp.status === 200 && resp.data) {
            // Various places the year id might hide
            return (
                resp.data?.data?.currentSchoolYear?.id ||
                resp.data?.currentSchoolYear?.id ||
                resp.data?.schoolYear?.id ||
                null
            );
        }
    } catch (_) {}
    return null;
}

module.exports = {
    getRestBearer,
    getRestBearerFromSession,
    fetchAppConfigForYear,
};
