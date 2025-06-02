import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventFollow = async (event) => {
    console.log(event);
    const follower_username = event.user_name;

    const msg = follower_username + " just followed";

    const {dataUrl, duration} = await GetTts(msg);

    const html = await ejs.renderFile("views/events/channel.follow.ejs",
        {
            name: follower_username,
            tts: dataUrl
        })

    return {timeout: 6, html: html}
}
