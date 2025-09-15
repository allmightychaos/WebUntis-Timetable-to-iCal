// Parse and cache multi-account credentials from WEBUNTIS_ACCOUNTS JSON env
let cache = null;
function loadAccounts() {
    if (cache) return cache;
    const raw = process.env.WEBUNTIS_ACCOUNTS;
    if (!raw) {
        cache = [];
        return cache;
    }
    try {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) {
            cache = [];
            return cache;
        }
        cache = arr
            .filter(
                (a) =>
                    a &&
                    a.id &&
                    a.domain &&
                    a.school &&
                    a.username &&
                    a.password
            )
            .map((a) => ({
                id: String(a.id).toLowerCase(),
                domain: a.domain.trim(),
                school: a.school.trim(),
                username: String(a.username).trim(),
                password: a.password,
            }));
    } catch {
        cache = [];
    }
    return cache;
}
function getAccount(id) {
    return (
        loadAccounts().find((a) => a.id === String(id).toLowerCase()) || null
    );
}
module.exports = { loadAccounts, getAccount };
