import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventResub = async (event) => {
    const name = event.user_name;
    const length = event.cumulative_months;
    let msg = name + " just tier " + event.tier/1000 + " subscribed!";
    const {dataUrl, duration} = await GetTts(msg);
    msg += `${length} months!`; // not ttsed

    const html = await ejs.renderFile("views/events/NewSub.ejs",
        {
            msg: msg,
            tts: dataUrl
        })

    return {timeout: 6, html: html}
}
