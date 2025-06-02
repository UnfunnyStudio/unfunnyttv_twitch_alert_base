import { env } from "./jsonenv.js";
import {refreshAccessToken} from "./RefreshToken.js";

let user_id = null;
export const GetUserId = async () => {
    if (user_id) return user_id;
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
        refreshAccessToken()
        return null;
    }
    user_id = id;
    return id;
}
