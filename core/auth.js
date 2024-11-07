// src/core/auth.js
import axios from 'axios';

async function login(domain, school, username, password) {
      try {
            const url = `https://${domain}.webuntis.com/WebUntis/jsonrpc.do?school=${encodeURIComponent(school)}`;
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

export { login };
