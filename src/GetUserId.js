import { env } from "./jsonenv.js";
import {refreshAccessToken} from "./RefreshToken.js";

export const GetUserId = async () => {
    let id = null;
    try {
        const responce = await fetch("https://api.twitch.tv/helix/users", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.access_token}`,
                "Client-Id": env.client_id
            }
        })
        id = (await responce.json()).data[0].id;
    } catch (e) {
        console.error("[ERROR] Failed to get users auth code " + e);
        await refreshAccessToken()
        return null;
    }
    return id;
}
