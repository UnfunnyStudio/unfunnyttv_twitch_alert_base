import {env, SaveEnv} from "./jsonenv.js";

// true or false based on if the token was refreshed
const refreshAccessToken = async () => {
    try {
        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", env.refresh_token); // Use your stored refresh token
        params.append("client_id", env.client_id);
        params.append("client_secret", env.client_secret);

        const response = await fetch("https://id.twitch.tv/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        });

        if (!response.ok) {
            console.error("[ERROR] Failed to refresh access token:", response.status, response.statusText);
            return false;
        }

        const data = await response.json();
        console.log("[INFO] Successfully refreshed access token");

        if (!data.access_token && !data.refresh_token && !data.expires_in) {
            return false;
        }

        env.access_token = data.access_token;
        env.refresh_token = data.refresh_token;
        env.expires_at = Date.now() + data.expires_in * 1000;
        SaveEnv();
        return true;

    } catch (e) {
        console.error("[ERROR] Failed to refresh access token:", e);
    }
    return false;
};

// there should be a refresh token at this point and a access token
export const checkTokenValid = async () => {
    if (Date.now()+10000 > env.expires_at ) { // token has expired (+10000 to allow processing time after verification)
        const res = await refreshAccessToken();
        if (!res) { // if the refresh failed there is a big issues
            console.error("[FATAL] Failed to refresh access token");
            env.auth = false;
            process.exit(1);
        }
    }
    return true;
}