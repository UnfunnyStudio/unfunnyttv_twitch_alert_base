// the web server used for the overlay page, auth redirect
// exports StartWebserver and io (so that it can be accessed to send msg to the overly)

import express from "express";
import http from "http";
import {Server as SocketIOServer} from "socket.io";
import {env, SaveEnv} from "./jsonenv.js";
import {database} from "./Database.js";
import {HandleNotification} from "./EventHandeler.js";

const port = env.port || 3000;
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'))

const server = http.createServer(app);
export const io = new SocketIOServer(server);

// temp code

const get_sub_count = async () => {

    try {
        const user_details_resp = await fetch(`https://api.twitch.tv/helix/users?login=unfunnyttv`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${env.access_token}`,
                "Client-Id": env.client_id,
            }
        });
        const user_details = (await user_details_resp.json()).data[0].id;

        const sub_info_resp = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${user_details}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${env.access_token}`,
                "Client-Id": env.client_id,
            }
        });

        io.emit("subcount", (await sub_info_resp.json()).points);
    } catch (e) {
        console.error("WARN " + e);
    }
}

setInterval(async () => {
    await get_sub_count();
}, 15*1000)


// end of temp code

io.on('connection', (socket) => {
    console.log(`[INFO] Socket ${socket.id}:${socket.id}`);
})

app.get('/', (req, res) => {
    res.render('overlay', {})
})

app.get('/lol', (req, res) => {
    res.render('lol', {})
})

app.get('/subcount', (req, res) => {
    res.render('subcount', {})
})



app.get('/auth/twitch/callback', async (req, res) => {
    const code = req.query.code;
    console.log(req.body);
    if (!code) {
        console.log("[INFO] failed to get users auth code ");
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
    console.log(data);

    env.access_token = data.access_token;
    env.refresh_token = data.refresh_token;
    env.expires_at = Date.now() + data.expires_in * 1000;
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



// /alertman page
app.get('/alertman', (req, res) => {
    res.render('alertman', {});
});

// API endpoint to get latest 50 alerts
app.get('/get50', (req, res) => {
    try {
        const stmt = database.prepare(`SELECT id, alert, time_sent, processed FROM alerts ORDER BY id DESC LIMIT 50`);
        const rows = stmt.all();
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).send("DB error");
    }
});

// Replay route
app.get('/replay/:id', (req, res) => {
    const id = req.params.id;
    try {
        const stmt = database.prepare(`SELECT alert FROM alerts WHERE id = ?`);
        const row = stmt.get(id);
        if (!row) {
            res.status(404).send("Alert not found");
            return;
        }
        const message = JSON.parse(row.alert);
        HandleNotification(message, true);
        res.send(`Replayed alert ID: ${id}`);
    } catch (e) {
        console.error(e);
        res.status(500).send("Replay error");
    }
});