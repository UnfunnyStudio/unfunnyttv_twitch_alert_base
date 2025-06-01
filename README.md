create a `env.json` with:
```json
{
  "client_id": "<twtich app client id>",
  "client_secret": "<twtich app client secret>",
  "redirect_uri": "http://localhost:3000/auth/twitch/callback", // for local testing should be set the same on the dev portal
  "scopes": "user:read:chat+bits:read+moderator:read:followers+channel:read:subscriptions"
}
```

1) npm install
2) node index.js
3) login with the link proivded
4) restart the app
5) walla now your user is authed (for like 4 hours as the refresh token is not set up yet, remove the `refresh_token` from the `env.json` to reauth)
