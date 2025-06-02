import {GetEventsToSubTo} from "./EventsToSubTo.js";
import {env} from "./jsonenv.js";
import { io } from "./webserver.js";
import {EventFollow} from "./events/EventFollow.js";
import {PointTTS} from "./events/PointTTS.js";
import {EventNewSub} from "./events/EventNewSub.js";
import {EventGiftSub} from "./events/EventGiftSub.js";
import {EventResub} from "./events/EventResub.js";

console.log("[INFO] Starting web socket server");

const event_queue = []
let event_active = false
let socket;

export const StartEventHandler = () => {
    socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10")

    socket.onopen = function () {
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
                }
                break;
            case "notification":
                await HandleNotification(message); // enable for real use
                // fake follower
                await HandleNotification({
                    payload: {
                        subscription: {
                            id: "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                            type: "channel.subscription.gift",
                            version: "1",
                            status: "enabled",
                            cost: 0,
                            condition: {
                                broadcaster_user_id: "1337"
                            },
                            transport: {
                                method: "webhook",
                                callback: "https://example.com/webhooks/callback"
                            },
                            created_at: "2019-11-16T10:11:12.634234626Z"
                        },
                        event: {
                            user_id: "1234",
                            user_login: "cool_user",
                            user_name: "Cool_User",
                            broadcaster_user_id: "1337",
                            broadcaster_user_login: "cooler_user",
                            broadcaster_user_name: "Cooler_User",
                            total: 2,
                            tier: "1000",
                            cumulative_total: 284, // null if anonymous or not shared
                            is_anonymous: false
                        }
                    }
                });
                break;
            case "session_keepalive":

                break;
        }

    }

// event handlers
    const HandleNotification = async (message) => {
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
                    func = EventNewSub;
                    break;
                case "channel.subscription.gift": // gifty
                    func = EventGiftSub;
                    break;
                case "channel.subscription.message": // resub
                    func = EventResub;
                    break;
                case "channel.follow": // follow
                    func = EventFollow
                    break;
                case "channel.cheer": // bits cheer
                    break;
                case "channel.chat.message": // bits cheer
                    break;
                case "channel.channel_points_custom_reward_redemption.add":
                    if (event.reward.title === "TTS"){
                        func = PointTTS
                    }
                    break;
            }

            const {html, timeout} = await func(event);
            io.emit("overlay_update", html, (timeout + 2)) // 2 seconds are added to the timeout for the fade
            await new Promise(resolve => setTimeout(resolve, timeout * 1000));
        } catch (e) {
            console.error("[ERROR] Failed do event:", e.message);
        } finally {
            event_active = false;

            if (event_queue.length > 0) {
                const queue_msg = event_queue.shift();
                await HandleNotification(queue_msg);
            }
        }
    }


    socket.onclose = (event) => {
        console.log("[INFO] Socket closed:", event.code, event.reason);
    };
}
