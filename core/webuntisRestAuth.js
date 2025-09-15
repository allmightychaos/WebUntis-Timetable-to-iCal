// core/webuntisRestAuth.js
// Attempt to obtain a REST Bearer token for the newer WebUntis REST endpoints.
// This is heuristic: different tenants / versions may expose different login endpoints.
// We try several variants and payload shapes.

const axios = require("axios");
const { resolveWebUntisHost } = require("./domain");

async function tryPost(url, payload, extraHeaders = {}) {
    try {
        return await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0",
                ...extraHeaders,
            },
            validateStatus: () => true,
        });
    } catch (e) {
        return { status: 0, error: e }; // network / other failure
    }
}
function extractTokenStructure(d) {
    if (!d) return null;
    if (d.token) return d;
    if (d.bearer) return { token: d.bearer, ...d };
    if (d.data && d.data.token) return d.data;
    return null;
}
function decodeJwt(t) {
    try {
        const [, p] = t.split(".");
        return JSON.parse(Buffer.from(p, "base64").toString("utf8"));
    } catch (_) {
        return null;
    }
}

async function getRestBearer(domain, school, username, password) {
    const host = await resolveWebUntisHost(domain);
    const base = `https://${host}`;
    const endpoints = [
        "/WebUntis/api/rest/auth/login",
        "/WebUntis/api/rest/view/v1/login",
        "/WebUntis/api/rest/authenticate/user",
    ].map((p) => base + p);
    const payloads = [
        { user: username, password, client: "client" },
        { username, password },
    ];
    const suffix = `?school=${encodeURIComponent(school)}`;
    for (const ep of endpoints)
        for (const body of payloads)
            for (const suf of ["", suffix]) {
                const url = ep + suf;
                const resp = await tryPost(url, body);
                if (resp.status === 200) {
                    const tok = extractTokenStructure(resp.data);
                    if (tok?.token)
                        return {
                            host,
                            token: tok.token,
                            tenantId: tok.tenantId || tok.tenant_id || null,
                            schoolYearId:
                                tok.schoolYearId || tok.school_year_id || null,
                            raw: resp.data,
                            endpoint: url,
                            method: "login-endpoint",
                        };
                }
            }
    return null;
}

// NEW: obtain token using existing JSON-RPC session via /WebUntis/api/token/new
// Requires JSESSIONID cookie (and usually schoolname + Tenant-Id). Returns raw JWT only (no JSON wrapper).
async function getRestBearerFromSession(domain, school, sessionId) {
    if (!sessionId) return null;
    const host = await resolveWebUntisHost(domain);
    const base = `https://${host}`;
    const encodedSchool = `_${Buffer.from(school).toString("base64")}`;
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
            const payload = decodeJwt(resp.data) || {};
            return {
                host,
                token: resp.data,
                tenantId: payload.tenant_id || payload.tenantId || null,
                schoolYearId: payload.schoolYearId || null,
                raw: payload,
                endpoint: `${base}/WebUntis/api/token/new`,
                method: "session-token-new",
                exp: payload.exp || null,
            };
        }
    } catch (_) {}
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
        if (resp.status === 200 && resp.data)
            return (
                resp.data?.data?.currentSchoolYear?.id ||
                resp.data?.currentSchoolYear?.id ||
                resp.data?.schoolYear?.id ||
                null
            );
    } catch (_) {}
    return null;
}

module.exports = {
    getRestBearer,
    getRestBearerFromSession,
    fetchAppConfigForYear,
};
