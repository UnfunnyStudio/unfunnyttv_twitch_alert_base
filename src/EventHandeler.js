import {GetEventsToSubTo} from "./EventsToSubTo.js";
import {env} from "./jsonenv.js";
import {io} from "./webserver.js";
import {EventFollow} from "./events/EventFollow.js";
import {PointTTS} from "./events/PointTTS.js";
import {EventSub} from "./events/EventSub.js";
import {EventCheer} from "./events/EventCheer.js";
import {EventRaid} from "./events/EventRaid.js";

console.log("[INFO] Starting web socket server");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const event_queue = []
let event_active = false
let socket;
let socket_down = true;

const Reconnect = async (timeout = 3) => {
    socket_down = true
    if (socket) { socket.close(); }
    console.log("[INFO] trying to reconnect after " + timeout + "'s");
    await sleep(timeout * 1000)
    StartEventHandler();
}

export const StartEventHandler = () => {
    socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10")
    socket_down = false;
    socket.onerror = async () => {
        if (socket_down) { return; }
        console.log("[INFO] error in websocket server");
        await Reconnect();
    }
    socket.onopen = async () => {
        if (socket_down) { return; }
        console.log("[INFO] Websocket connection opened");
    }

    socket.onmessage = async (event) => {
        if (socket_down) { return; }
        const message = JSON.parse(event.data);
        const message_type = message.metadata.message_type;
        if (message_type !== "session_keepalive") {
            console.log("[INFO] Received a message:", message_type);
        }

        try {
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
                        if (data.error) {
                            console.log("[WARN] Received error waiting 1m: ", data.error);
                            await Reconnect(60);
                            return;
                        }
                        console.log(`(${data.data[0].status}) ` + data.data[0].type);
                    }
                    break;
                case "notification":
                    await HandleNotification(message); // enable for real use
                    // fake gift sub
                    // await HandleNotification({
                    //     payload: {
                    //         subscription: {
                    //             id: "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             type: "channel.subscription.gift",
                    //             version: "1",
                    //             status: "enabled",
                    //             cost: 0,
                    //             condition: {
                    //                 broadcaster_user_id: "1337"
                    //             },
                    //             transport: {
                    //                 method: "webhook",
                    //                 callback: "https://example.com/webhooks/callback"
                    //             },
                    //             created_at: "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         event: {
                    //             user_id: "1234",
                    //             user_login: "cool_user",
                    //             user_name: "Cool_User",
                    //             broadcaster_user_id: "1337",
                    //             broadcaster_user_login: "cooler_user",
                    //             broadcaster_user_name: "Cooler_User",
                    //             total: 2,
                    //             tier: "1000",
                    //             cumulative_total: 284, // null if anonymous or not shared
                    //             is_anonymous: false
                    //         }
                    //     }
                    // });
                    //fake followerAdd commentMore actions
                    // await HandleNotification({
                    //     payload: {
                    //         subscription: {
                    //             id: "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             type: "channel.follow",
                    //             version: "2",
                    //             status: "enabled",
                    //             cost: 0,
                    //             condition: {
                    //                 broadcaster_user_id: "1337",
                    //                 moderator_user_id: "1337"
                    //             },
                    //             transport: {
                    //                 method: "webhook",
                    //                 callback: "https://example.com/webhooks/callback"
                    //             },
                    //             created_at: "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         event: {
                    //             user_id: "1234",
                    //             user_login: "cool_user",
                    //             user_name: "Cool_User",
                    //             broadcaster_user_id: "1337",
                    //             broadcaster_user_login: "cooler_user",
                    //             broadcaster_user_name: "Cooler_User",
                    //             followed_at: "2020-07-15T18:16:11.17106713Z"
                    //         }
                    //     }
                    // });
                    // await HandleNotification({
                    //     payload: {
                    //         subscription: {
                    //             id: "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             type: "channel.subscribe",
                    //             version: "1",
                    //             status: "enabled",
                    //             cost: 0,
                    //             condition: {
                    //                 broadcaster_user_id: "1337"
                    //             },
                    //             transport: {
                    //                 method: "webhook",
                    //                 callback: "https://example.com/webhooks/callback"
                    //             },
                    //             created_at: "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         event: {
                    //             user_id: "1234",
                    //             user_login: "cool_user",
                    //             user_name: "Cool_User",
                    //             broadcaster_user_id: "1337",
                    //             broadcaster_user_login: "cooler_user",
                    //             broadcaster_user_name: "Cooler_User",
                    //             tier: "1000",
                    //             is_gift: false
                    //         }
                    //     }
                    // })
                    // await HandleNotification({
                    //     payload: {
                    //         "subscription": {
                    //             "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             "type": "channel.subscription.message",
                    //             "version": "1",
                    //             "status": "enabled",
                    //             "cost": 0,
                    //             "condition": {
                    //                 "broadcaster_user_id": "1337"
                    //             },
                    //             "transport": {
                    //                 "method": "webhook",
                    //                 "callback": "https://example.com/webhooks/callback"
                    //             },
                    //             "created_at": "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         "event": {
                    //             "user_id": "1234",
                    //             "user_login": "cool_user",
                    //             "user_name": "Cool_User",
                    //             "broadcaster_user_id": "1337",
                    //             "broadcaster_user_login": "cooler_user",
                    //             "broadcaster_user_name": "Cooler_User",
                    //             "tier": "1000",
                    //             "message": {
                    //                 "text": "Love the stream! FevziGG",
                    //                 "emotes": [
                    //                     {
                    //                         "begin": 23,
                    //                         "end": 30,
                    //                         "id": "302976485"
                    //                     }
                    //                 ]
                    //             },
                    //             "cumulative_months": 15,
                    //             "streak_months": 1, // null if not shared
                    //             "duration_months": 6
                    //         }
                    //     }
                    // })
                    // await HandleNotification({
                    //     payload: {
                    //         "subscription": {
                    //             "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             "type": "channel.cheer",
                    //             "version": "1",
                    //             "status": "enabled",
                    //             "cost": 0,
                    //             "condition": {
                    //                 "broadcaster_user_id": "1337"
                    //             },
                    //             "transport": {
                    //                 "method": "webhook",
                    //                 "callback": "https://example.com/webhooks/callback"
                    //             },
                    //             "created_at": "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         "event": {
                    //             "is_anonymous": false,
                    //             "user_id": "1234",          // null if is_anonymous=true
                    //             "user_login": "cool_user",  // null if is_anonymous=true
                    //             "user_name": "Cool_User",   // null if is_anonymous=true
                    //             "broadcaster_user_id": "1337",
                    //             "broadcaster_user_login": "cooler_user",
                    //             "broadcaster_user_name": "Cooler_User",
                    //             "message": "pogchamp",
                    //             "bits": 1000
                    //         }
                    //     }
                    // // })
                    // await HandleNotification({
                    //     payload: {
                    //         "subscription": {
                    //             "id": "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
                    //             "type": "channel.raid",
                    //             "version": "1",
                    //             "status": "enabled",
                    //             "cost": 0,
                    //             "condition": {
                    //                 "to_broadcaster_user_id": "1337"
                    //             },
                    //             "transport": {
                    //                 "method": "webhook",
                    //                 "callback": "https://example.com/webhooks/callback"
                    //             },
                    //             "created_at": "2019-11-16T10:11:12.634234626Z"
                    //         },
                    //         "event": {
                    //             "from_broadcaster_user_id": "1234",
                    //             "from_broadcaster_user_login": "cool_user",
                    //             "from_broadcaster_user_name": "Cool_User",
                    //             "to_broadcaster_user_id": "1337",
                    //             "to_broadcaster_user_login": "cooler_user",
                    //             "to_broadcaster_user_name": "Cooler_User",
                    //             "viewers": 9001
                    //         }
                    //     }
                    // })
                    break;
                case "session_keepalive":
                    //console.log(`[INFO] Received session keepalive ${(new Date()).toISOString()}`);
                    break;
            }
        } catch (error) {
            console.log("[INFO] error in event loop reconnecting in 30s " + error.message);
            await Reconnect(30);
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

            let {html, timeout, tts_delay} = await func({event: event, type:type});
            if (!tts_delay) tts_delay = 0;
            timeout += 2;
            io.emit("overlay_update", html, timeout, tts_delay) // 2 seconds are added to the timeout for the fade
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


    socket.onclose = async (event) => {
        if (socket_down) { return; }
        console.log("[INFO] Socket closed:", event.code, event.reason);
        await Reconnect();
    };
}
