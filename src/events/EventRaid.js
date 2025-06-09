import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventRaid = async ({event, type}) => {
    const username = event.from_broadcaster_user_name || "anonymous";
    const views = event.viewers || "0";

    const message_to_tts = `${username} raided with ${views} viewers!`;
    const {dataUrl, duration} = await GetTts(message_to_tts);


    const html = await ejs.renderFile(`views/events/follow/1.ejs`,
    {
        name: message_to_tts,
        tts: dataUrl,
        video_path: `pre_made_videos/fbi_alert.mp4`,
    })


    return {timeout: duration+3, html: html, tts_delay: 3}

}