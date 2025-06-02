import {env, SaveEnv} from "./jsonenv.js";

export const refreshAccessToken = async () => {
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
            return null;
        }

        const data = await response.json();
        console.log("[INFO] Successfully refreshed access token");

        env.access_token = data.access_token;
        env.refresh_token = data.refresh_token;
        SaveEnv();

    } catch (e) {
        console.error("[ERROR] Failed to refresh access token:", e);
        return null;
    }
};