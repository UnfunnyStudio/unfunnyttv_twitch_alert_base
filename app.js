import ejs from 'ejs';

// custom file imports
import { env } from "./src/jsonenv.js";
import { GetTts, SetTTSExportPath } from "./src/tts.js";
import { StartWebserver } from './src/webserver.js';

SetTTSExportPath("public/tts/");

StartWebserver();

// if the user has not authed then they need to do this!
if (!env.auth) {
    const auth_url = "https://id.twitch.tv/oauth2/authorize" + "?response_type=code" + `&client_id=${env.client_id}` + `&redirect_uri=${env.redirect_uri}` + `&scope=${env.scopes}`;
    console.log("[INFO] You! Yes you! Go here ---> " + auth_url);
    while (!env.auth) { // no blocking, block! kinda funny
        await new Promise(resolve => setTimeout(resolve, 100));
    };
} else console.log("[INFO] users all ready logged in");


// user id
let user_id = null;
const GetUserId = async () => {
    if (user_id) return user_id;
    let id = null;
    try {
        const responce = await fetch("https://api.twitch.tv/helix/users", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.access_token}`,
                "Client-Id": env.client_id
            }
        })
        id = (await responce.json()).data[0].id;
    } catch (e) {
        console.error("[ERROR] Failed to get users auth code " + e);
        return null;
    }
    user_id = id;
    return id;
}

// the events that need subing :)
const GetEventSubRequests = async (session_id) => {

    let streamer_id = null;

    while (!streamer_id) {
        streamer_id = await GetUserId();
        if (!streamer_id) {
            console.log("[WARN] there was a error getting streamer ID");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    return [
        { // get each message sent in chat just added this one for testing
            type: "channel.chat.message",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id,
                user_id: streamer_id,
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        { // get the follows not much else to say about this one
            type: "channel.follow",
            version: "2",
            condition: {
                broadcaster_user_id: streamer_id,
                moderator_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        { // when people sub but not resub
            type: "channel.subscribe",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        { // gifted!
            type: "channel.subscription.gift",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        { // resub with message only if they share it
            type: "channel.subscription.message",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        {
            type: "channel.cheer",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        },
        {
            type: "channel.channel_points_custom_reward_redemption.add",
            version: "1",
            condition: {
                broadcaster_user_id: streamer_id
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        }
    ]
}


// web socket part
console.log("[INFO] Starting web socket server");

const event_queue = []
let event_active = false

const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=10");

socket.onopen = function () {

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
            const event_sub_requests = await GetEventSubRequests(session_id);
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
            await HandleNotification(message);
            // fake follower
            // await HandleNotification({
            //     payload: {
            //         subscription: {
            //             id: "f1c2a387-161a-49f9-a165-0f21d7a4e1c4",
            //             type: "channel.follow",
            //             version: "2",
            //             status: "enabled",
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
            //             broadcaster_user_id: "1337",
            //             followed_at: "2020-07-15T18:16:11.17106713Z"
            //         }
            //     }
            // });
            break;
        case "session_keepalive":

            break;
    }

}

// event handlers
const HandleNotification = async (message) => {
    // if a event is active add to queue
    if (event_active) {
        event_queue.push(message);
        return;
    }
    event_active = true;

    try {
        const type = message.payload.subscription.type;
        const event = message.payload.event;
        console.log("[INFO] Received notification:", type);

        let html = null;
        let timeout = 0;
        let dataUrl = null
        let duration = 0;
        let name = "no name";
        let msg = "no message";
        switch (type) {
            case "channel.subscribe": // first timer
                break;
            case "channel.subscription.gift": // gifty
                break;
            case "channel.subscription.message": // resub
                break;
            case "channel.follow": // follow
                const follower_username = event.user_login;
                msg = follower_username + " just followed";
                ({dataUrl, duration} = await GetTts(msg));
                html = await ejs.renderFile("views/events/channel.follow.ejs",
                    {
                        name: follower_username,
                        tts: dataUrl
                    })
                timeout = 10
                break;
            case "channel.cheer": // bits cheer
                break;


            case "channel.chat.message": // bits cheer
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
                break;
            case "channel.channel_points_custom_reward_redemption.add":
                if (event.reward.title === "TTS"){
                    name = event.user_name;
                    msg = event.user_input;
                    ({dataUrl, duration} = await GetTts(msg));
                    timeout = duration + 2;
                    html = await ejs.renderFile("views/events/channel.channel_points_custom_reward_redemption.add-tts.ejs", {
                        name: name,
                        msg: msg,
                        tts: dataUrl
                    })
                }
                break;
        }

        io.emit("overlay_update", html, timeout - 2)
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