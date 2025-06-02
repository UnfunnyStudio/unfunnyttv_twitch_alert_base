// the web server used for the overlay page, auth redirect
// exports StartWebserver and io (so that it can be accessed to send msg to the overly)

import express from "express";
import http from "http";
import {Server as SocketIOServer} from "socket.io";
import {env, SaveEnv} from "./jsonenv.js";

const port = env.PORT || 3000;
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'))

const server = http.createServer(app);
export const io = new SocketIOServer(server);

io.on('connection', (socket) => {
    console.log(`[INFO] Socket ${socket.id}:${socket.id}`);
})

app.get('/', (req, res) => {
    res.render('overlay', {})
})

app.get('/auth/twitch/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.log("[INFO] failed to get users auth code ");
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
    env.auth = true
    SaveEnv();
    res.send("Authentication successful! You can close this window.");
})

export const StartWebserver = () => {
    console.log("[INFO] Staring web server");
    server.listen(port, () => {
        console.log(`[INFO] Server listening on port ${port}`);
    })


}