import {GetEventsToSubTo} from "./EventsToSubTo.js";
import {env} from "./jsonenv.js";
import {io} from "./webserver.js";
import {EventFollow} from "./events/EventFollow.js";
import {PointTTS} from "./events/PointTTS.js";
import {EventSub} from "./events/EventSub.js";
import {EventCheer} from "./events/EventCheer.js";
import {EventRaid} from "./events/EventRaid.js";
import {checkTokenValid} from "./RefreshToken.js";
import {database} from "./Database.js";

console.log("[INFO] Starting web socket server");

const event_queue = []
let event_active = false
let socket;

export const StartEventHandler = () => {
    socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10")
    socket.onerror = async () => {
        console.log("[INFO] error in websocket server");
    }
    socket.onopen = async () => {
        console.log("[INFO] Websocket connection opened");
    }

    socket.onmessage = async (event) => {
        
        const message = JSON.parse(event.data);
        const message_type = message.metadata.message_type;
        if (message_type !== "session_keepalive") {
            console.log("[INFO] Received a message:", message_type);
        }

        switch (message_type) {
            case "session_welcome":
                const session_id = message.payload.session.id;
                console.log("[INFO] Received session id ", session_id);
                // sub to events
                const event_sub_requests = await GetEventsToSubTo(session_id);
                for (let i = 0; i < event_sub_requests.length; i++) {
                    await checkTokenValid();
                    try {

                        const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${env.access_token}`,
                                "Client-Id": env.client_id,
                            }, body: JSON.stringify(event_sub_requests[i])
                        });
                        const data = await response.json();
                        console.log(`(${data.data[0].status}) ` + data.data[0].type);
                    } catch (error) {
                        console.log("[INFO] Error subing", error, event_sub_requests[i]);
                    }
                }
                break;
            case "notification":
                await HandleNotification(message);
                break;
        }

    }

    socket.onclose = async (event) => {
        console.log("[INFO] Socket closed:", event.code, event.reason);
        StartEventHandler();
    };
}

export const HandleNotification = async (message, replay=false) => {
    let dbId = -1;
    if (!replay){
        const insertStmt = database.prepare(`
                INSERT INTO alerts (alert)
                VALUES (?)
            `);

        const result = insertStmt.run(JSON.stringify(message));
        dbId = result.lastInsertRowid;
    }

    // if an event is active add to queue
    if (event_active) {
        event_queue.push(message);
        return;
    }
    event_active = true;

    try {
        const type = message.payload.subscription.type;
        const event = message.payload.event;
        console.log("[INFO] Received notification:", type);

        let func;
        switch (type) {
            case "channel.subscribe": // first timer
            case "channel.subscription.gift": // gifty
            case "channel.subscription.message": // resub
                func = EventSub
                break;
            case "channel.follow": // follow
                func = EventFollow
                break;
            case "channel.cheer": // bits cheer
                func = EventCheer
                break;
            case "channel.chat.message": // bits cheer
                break;
            case "channel.channel_points_custom_reward_redemption.add":
                if (event.reward.title === "TTS") {
                    func = PointTTS
                }
                break;
            case "channel.raid":
                func = EventRaid
                break
        }

        if (func) {
            let {html, timeout, tts_delay} = await func({event: event, type: type});
            if (!tts_delay) tts_delay = 0;
            timeout += 2;
            io.emit("overlay_update", html, timeout, tts_delay) // 2 seconds are added to the timeout for the fade
            await new Promise(resolve => setTimeout(resolve, timeout * 1000));

            if (!replay) {
                const insertStmt = database.prepare(`
                UPDATE alerts SET processed = 1 WHERE id = ?
            `);
                insertStmt.run(dbId);
            }
        }
    } catch (e) {
        console.error("[ERROR] Failed do event:", e.message);
    } finally {
        event_active = false;

        if (event_queue.length > 0) {
            const queue_msg = event_queue.shift();
            await HandleNotification(queue_msg, replay);
        }
    }
}
