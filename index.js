import fs from 'fs'
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import ejs from 'ejs';
import say from "say";
import { v4 as uuidv4 } from 'uuid';
import { parseFile } from 'music-metadata';




// load json env file (yes im not using dot env as i need to update the values at runtime)
if (!fs.existsSync("env.json")) {
    console.log("[ERROR] There is no `env.json` file");
    process.exit(1)
} // no file? die!

let env = null;
try {
    const file_data = fs.readFileSync('env.json', 'utf8');
    env = JSON.parse(file_data);
} catch (e) {
    console.error("[ERROR] failed to read and parse `env.json` : " + e);
    process.exit(1)
}


// lets just not have race cons :)
let env_write_in_progress = false;
let env_write_queue = []

const SaveEnv = () => {
    console.log(env)
    if (env_write_in_progress) {
        env_write_queue.push(true);
        return;
    }
    env_write_in_progress = true;
    try {
        fs.writeFile('env.json', JSON.stringify(env, null, 2), (err) => {
            env_write_in_progress = false;
            if (env_write_queue.length > 0) {
                env_write_queue.pop();
                SaveEnv();
            }
        });
    } catch (e) {
        console.error("[WARN] failed to save `env.json` : " + e);
    }

}


const GetTts = (text = "No tts?") => {
    return new Promise(async (resolve, reject) => {
        const name = `public/tts/${uuidv4()}.wav`;

        say.export(text, null, 1, name, async (err) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const metadata = await parseFile(name);
                const duration = metadata.format.duration; // in seconds!
                console.log(duration);
                const audioBuffer = fs.readFileSync(name);
                const base64Audio = audioBuffer.toString('base64');
                const dataUrl = `data:audio/wav;base64,${base64Audio}`;

                resolve({ dataUrl, duration });
            } catch (e) {
                reject(e);
            }
        });
    });
};


const auth_url = "https://id.twitch.tv/oauth2/authorize" + "?response_type=code" + `&client_id=${env.client_id}` + `&redirect_uri=${env.redirect_uri}` + `&scope=${env.scopes}`;
console.log("[INFO] You! Yes you! Go here ---> " + auth_url);

// start http server for auth rec
console.log("[INFO] Staring web server");
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'))
const server = http.createServer(app);
const io = new SocketIOServer(server);

const port = env.PORT || 3000;
server.listen(port, () => {
    console.log(`[INFO] Server listening on port ${port}`);
})

io.on('connection', (socket) => {
    console.log(`[INFO] Socket ${socket.id}:${socket.id}`);
})



app.get('/', (req, res) => {
    res.render('overlay', {})
})

app.get('/auth/twitch/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.log("[INFO] failed to get users auth code");
        res.send("Authentication error check console log");
        return;
    } else if (env.refresh_token) {
        console.log("[INFO] Found refresh token, new login attempt blocked!");
        res.send("Authentication error check console log");
        return;
    }
    console.log("[INFO] attempting to get users auth code");
    const responce = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            client_id: env.client_id,
            client_secret: env.client_secret,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: `${env.redirect_uri}`,
        }),
    })

    const data = await responce.json();

    env.access_token = data.access_token;
    env.refresh_token = data.refresh_token;
    SaveEnv();
    res.send("Authentication successful! You can close this window.");
})

// user id
let user_id = null;
const GetUserId = async () => {
    if (user_id) return user_id;
    let id = null;
    try{
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
        console.error("[ERROR] Failed to get users auth code");
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
        }
    ]
}


// web socket part
console.log("[INFO] Starting web socket server");

const event_queue = []
let event_active = false

const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=20");

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
        const type = message.metadata.subscription_type;
        const event = message.payload.event;
        console.log("[INFO] Received handleNotification:", type);

        let html = null;
        let timeout = 0;
        switch (type) {
            case "channel.subscribe": // first timer
                break;
            case "channel.subscription.gift": // gifty
                break;
            case "channel.subscription.message": // resub
                break;
            case "channel.follow": // follow
                break;
            case "channel.cheer": // bits cheer
                break;
            case "channel.chat.message": // bits cheer
                const name = event.chatter_user_name;
                const msg = event.message.text;
                const {dataUrl, duration}= await GetTts(msg)
                timeout = duration;
                html = await ejs.renderFile("views/events/channel.chat.message.ejs", {name: name, msg: msg, tts: dataUrl})
                break;
        }

        io.emit("overlay_update", html)
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