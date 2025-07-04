import { env } from "./jsonenv.js";
import {checkTokenValid} from "./RefreshToken.js";

export const GetUserId = async () => {
    let error = "";
    try {
        await checkTokenValid();
        const response = await fetch("https://api.twitch.tv/helix/users", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.access_token}`,
                "Client-Id": env.client_id
            }
        })
        const userId = (await response.json()).data[0].id;
        if (userId) return userId;
    } catch (e) {
        error = e;
    }
    console.error("[FATAL] Failed to get users auth code " + error);
    process.exit(1);// if the user id could not be gotten the programme can nolonder work
}
