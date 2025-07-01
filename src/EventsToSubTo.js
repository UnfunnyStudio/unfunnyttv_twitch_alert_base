import { GetUserId } from "./GetUserId.js";

export const GetEventsToSubTo = async (session_id) => {
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
        },
        {
            type: "channel.raid",
            version: "1",
            condition: {
                to_broadcaster_user_id: "1337", // could provide from_broadcaster_user_id instead
            },
            transport: {
                method: "websocket",
                session_id: session_id
            }
        }
    ]
}