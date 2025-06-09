import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventFollow = async ({event}) => {
    const username = event.user_name || "anonymous";
    const message_to_tts = username + " just followed";
    const {dataUrl, duration} = await GetTts(message_to_tts);

    const video_options = [
        {
            "filename": "follow_cat_bomb.mp4",
            "tts_delay": 0,
            "timeout": 6,
        },
        {
            "filename": "iron_flash_bang.webm",
            "tts_delay": 7,
            "timeout": 11,
        }

    ]

    const video_to_play = Math.floor(Math.random() * (video_options.length));
    const selected_video = video_options[video_to_play];
    console.log(selected_video);

    const html = await ejs.renderFile(`views/events/follow/1.ejs`,
        {
            name: message_to_tts,
            tts: dataUrl,
            video_path: `pre_made_videos/follow/${selected_video.filename}`,
        })

    return {timeout: selected_video.timeout, html: html, tts_delay: selected_video.tts_delay}
}
