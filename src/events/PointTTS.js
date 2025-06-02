import {GetTts} from "../tts";
import ejs from "ejs";

name = event.user_name;
msg = event.user_input;
({dataUrl, duration} = await GetTts(msg));
timeout = duration + 2;
html = await ejs.renderFile("views/events/channel.channel_points_custom_reward_redemption.add-tts.ejs", {
    name: name,
    msg: msg,
    tts: dataUrl
})