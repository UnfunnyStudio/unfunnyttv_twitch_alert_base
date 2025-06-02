// this is just a dump of old logic for now

import {GetTts} from "../tts";
import ejs from "ejs";

if (event.channel_points_animation_id
    || event.channel_points_custom_reward_id
    || event.cheer) return;
msg = event.message.text;
({dataUrl, duration} = await GetTts(msg));
timeout = duration + 2;
html = await ejs.renderFile("views/events/channel.chat.message.ejs", {
    name: event.chatter_user_name,
    msg: msg,
    tts: dataUrl
})