import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventSub = async ({event, type}) => {
    if (event.is_gift === true) return {timeout: 0, html: "", tts_delay: 0};
    const username = event.user_name || "anonymous";
    const sub_tier = event.tier/1000 || "?"
    const length_subed = event.cumulative_months || "";
    const sub_message = event.message?.text || "";

    const video_options_non_gift = [
        {
            "filename": "pre_made_videos/follow/iron_flash_bang.webm",
            "tts_delay": 7
        }
    ]

    const video_options_gift = [
        {
            "filename": "pre_made_videos/gift_sub/gift_sub.webm",
            "tts_delay": 7
        }

    ]

    let message_to_tts = username
    let selected_video;
    let message_to_show;
    if (type.includes("gift")) {
        selected_video = video_options_gift[Math.floor(Math.random() * video_options_gift.length)]
        const amount_gifted = event.total;
        message_to_tts += ` just gifted ${amount_gifted} tier ${sub_tier}!`
    } else {
        selected_video = video_options_non_gift[Math.floor(Math.random() * video_options_non_gift.length)]
        message_to_tts += ` just tier ${sub_tier} subscribed!`
    }

    message_to_show = message_to_tts;

    if (type.includes("message")){
        message_to_show += ` ${length_subed}m`;
        message_to_tts += ` ${sub_message}`
    }



    const {dataUrl, duration} = await GetTts(message_to_tts);

    const html = await ejs.renderFile("views/events/NewSub.ejs",
        {
            msg: message_to_show,
            tts: dataUrl,
            extra_line: sub_message,
            video_path: selected_video.filename,
        })

    return {timeout: duration+selected_video.tts_delay, html: html, tts_delay: selected_video.tts_delay}
}
