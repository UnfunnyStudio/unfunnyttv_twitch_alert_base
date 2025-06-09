import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventCheer = async ({event, type}) => {
    const username = event.user_name || "anonymous";
    const user_message = event.message || "";
    const bits = event.bits || "";

    const message_to_tts = `${username} cheered ${bits} bits! ${user_message}!`;
    const {dataUrl, duration} = await GetTts(message_to_tts);


    const html = await ejs.renderFile("views/events/point_tts.ejs", {
        name: `${username} cheered ${bits} bits!`,
        msg: user_message,
        tts: dataUrl
    })

    return {timeout: duration, html: html, tts_delay: 3}

}