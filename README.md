## What is this?

This is a simple project I built for myself to enhance my Twitch alerts and create a better stream experience. It’s not designed for general use or as a polished product—just a tool I use personally. However, I believe it could help others learn how to use the Twitch EventSub API and integrate it with their own projects.

## How to use

1. Create a file named `env.json` with the following content:
   ```json
   {
     "port": 3000,
     "client_id": "<your Twitch app client ID>",
     "client_secret": "<your Twitch app client secret>",
     "redirect_uri": "http://localhost:3000/auth/twitch/callback",
     "scopes": "user:read:chat+bits:read+moderator:read:followers+channel:read:subscriptions+channel:manage:redemptions"
   }
   ```
    - For local testing, make sure the `redirect_uri` matches what you’ve set in the Twitch Developer Portal.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   node app.js
   ```

4. Follow the login link provided in the console to authenticate.

5. After authentication, restart the app:
   ```bash
   node app.js
   ```

6. You’re all set! Your user will be authenticated for about 4 hours (until the access token expires). To re-authenticate, simply remove the `refresh_token` from `env.json` and go through the login flow again.

---

### Checklist of supported alerts:

- [x] TTS (via channel point redemption)
- [x] Follower alerts
- [x] Subscription alerts
- [x] Re-subscription alerts
- [x] Gifted subscription alerts
- [X] Cheers (bits) alerts
- [X] Raid alerts

---

### Notes:

- For TTS (text-to-speech) channel point redemptions:
    - Create a custom reward on Twitch named “TTS” that takes user input.
    - TTS currently only works if you’re hosting the app on **Windows** (otherwise, it’ll probably just crash).

---
