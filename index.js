import fs from 'fs'
import express from 'express';

// load json env file (yes im not using dot env as i need to update the values at runtime)
if (!fs.existsSync("env.json")) process.exit(1); // no file? die!
const file_data = fs.readFileSync('env.json', 'utf8');
let env = JSON.parse(file_data);

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
    fs.writeFile('env.json', JSON.stringify(env, null, 2), (err) => {
        env_write_in_progress = false;
        if (env_write_queue.length > 0) {
            env_write_queue.pop();
            SaveEnv();
        }
    });
}


const auth_url = "https://id.twitch.tv/oauth2/authorize" + "?response_type=code" + `&client_id=${env.client_id}` + `&redirect_uri=${env.redirect_uri}` + `&scope=${env.scopes}`;
console.log("You! Yes you! Go here ---> " + auth_url);

// start http server for auth rec
console.log("Staring web server");
const app = express();
const port = env.PORT || 3000;
app.listen(port, () => {})

app.get('/auth/twitch/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.log("failed to get users auth code");
        res.send("Authentication error check console log");
        return;
    } else if (env.refresh_token) {
        console.log("Found refresh token, new login attempt blocked!");
        res.send("Authentication error check console log");
        return;
    }
    console.log("attempting to get users auth code");
    const responce = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

    const responce = await fetch("https://api.twitch.tv/helix/users", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.access_token}`,
            "Client-Id": env.client_id
        }
    })
    const id = (await responce.json()).data[0].id;
    if (!id) {
        console.log("there was a error getting user id");
    }
    user_id = id;
    return id;
}

// web socket part
console.log("Starting web socket server");

const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=20");

socket.onopen = function () {

}

socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    const message_type = message.metadata.message_type;
    const streamer_id = await GetUserId();
    if (message_type !== "session_keepalive") {
        console.log("Received a message:", message_type);
    }

    switch (message_type) {
        case "session_welcome":
            const session_id = message.payload.session.id;
            console.log("Received session id ", session_id);
            // sub to events
            let request = {
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
            }

            const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${env.access_token}`,
                    "Client-Id": env.client_id,
                }, body: JSON.stringify(request)
            });

            break;
        case "session_keepalive":
            break;
    }


}

socket.onclose = (event) => {
    console.log("Socket closed:", event.code, event.reason);
};