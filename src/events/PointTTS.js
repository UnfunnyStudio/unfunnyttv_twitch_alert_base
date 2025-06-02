import {GetTts} from "../tts.js";
import ejs from "ejs";

export const PointTTS = async (event) => {
    console.log(event);
    const name = event.user_name;
    const tts_msg = event.user_input;

    const {dataUrl, duration} = await GetTts(tts_msg);

    const html = await ejs.renderFile("views/events/channel.channel_points_custom_reward_redemption.add-tts.ejs", {
        name: name,
        msg: tts_msg,
        tts: dataUrl
    })

    return {timeout: duration, html: html}
}
