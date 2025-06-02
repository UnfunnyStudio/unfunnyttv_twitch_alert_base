import {GetTts} from "../tts.js";
import ejs from "ejs";

export const EventGiftSub = async (event) => {
    console.log(event);
    const name = event.user_name || "?";
    const ammount = event.total;
    const msg = `${name} just gifted ${ammount} tier ${event.tier/1000} subs!`;

    const {dataUrl, duration} = await GetTts(msg);

    const html = await ejs.renderFile("views/events/NewSub.ejs",
        {
            msg: msg,
            tts: dataUrl
        })

    return {timeout: 6, html: html}
}
