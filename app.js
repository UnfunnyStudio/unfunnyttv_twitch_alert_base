import { env } from "./src/jsonenv.js";
import { StartWebserver } from './src/webserver.js';
import {StartEventHandler} from "./src/EventHandeler.js";
import {StartLolRankTracking} from "./src/LolRankTracking.js";
import "./src/Database.js"

await StartLolRankTracking(); // comment out to disable

StartWebserver();

// if the user has not authed then they need to do this!
if (!env.auth) {
    const auth_url = "https://id.twitch.tv/oauth2/authorize" + "?response_type=code" + `&client_id=${env.client_id}` + `&redirect_uri=${env.redirect_uri}` + `&scope=${env.scopes}`;
    console.log("[INFO] You! Yes you! Go here ---> " + auth_url);
    while (!env.auth) { // no blocking, block! kinda funny
        await new Promise(resolve => setTimeout(resolve, 100));
    };
} else console.log("[INFO] user all ready logged in");

StartEventHandler();
