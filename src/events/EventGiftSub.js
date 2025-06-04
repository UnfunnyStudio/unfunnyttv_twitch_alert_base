import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventGiftSub = async (event) => {
    const name = event.user_name || "?";
    const ammount = event.total;
    const msg = `${name} just gifted ${ammount} tier ${event.tier/1000} subs!`;

    const {dataUrl, duration} = await GetTts(msg);

    const html = await ejs.renderFile("views/events/GiftSub.ejs",
        {
            msg: msg,
            tts: dataUrl
        })

    return {timeout: 10, html: html, tts_delay: 5}
}
