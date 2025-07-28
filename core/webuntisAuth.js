// src/core/webuntisAuth.js
const axios = require('axios');
const { resolveWebUntisHost } = require('./domain');

async function login(domain, school, username, password) {
      try {
            const host = await resolveWebUntisHost(domain);
            const url = `https://${host}/WebUntis/jsonrpc.do?school=${encodeURIComponent(school)}`;
            const response = await axios.post(url, {
                  id: "id",
                  method: "authenticate",
                  params: { user: username, password: password, client: "client" },
                  jsonrpc: "2.0"
            });

            return response.data.result;
      } catch (error) {
            console.error("Login Error:", error.response?.data || error.message);
            return null;
      }
}

module.exports = { login };