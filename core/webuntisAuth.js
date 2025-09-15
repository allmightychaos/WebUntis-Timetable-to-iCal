const axios = require("axios");
const { resolveWebUntisHost } = require("./domain");

async function login(domain, school, username, password) {
    try {
        const host = await resolveWebUntisHost(domain);
        const url = `https://${host}/WebUntis/jsonrpc.do?school=${encodeURIComponent(
            school
        )}`;
        const { data } = await axios.post(url, {
            id: "id",
            method: "authenticate",
            params: { user: username, password, client: "client" },
            jsonrpc: "2.0",
        });

        return data.result;
    } catch (e) {
        console.error("Login Error:", e.response?.data || e.message);
        return null;
    }
}

module.exports = { login };
