# Task Fail Alert

Script to monitor Windows Scheduled Tasks and send an email alert using on-prem Exchange if a task fails.

## Setup

1. `npm i` to install dependencies
2. `node index.js` to run in console

### config.json

Rename `config.template.json` to `config.json` and fill the required credentials to use the application.

- `taskNames`: array of task names
- `emailRecipients`: string of recipients of the email notification in format `"user1@email.com; user2@email.com"`
- `emailAuth`: object containing user and password for the email account used for sending the notification. Format: `{ "user": "bogdan-it", "pass": "123456"}`
- `emailHost`: string hostname of the email server
- `emailPort`: SMTP port of the email server

## Using OAuth2 (Exchange / Office 365)

This project can use OAuth2 for sending mail via an Exchange mailbox (what this repository previously did). The code now performs a refresh-token exchange itself and will persist rotated refresh tokens and short-lived access token metadata in the `oauth_config.json` file (the project reads this from `C:/_Projects/_oauth_config/oauth_config.json` in your setup).

Important notes:

- When you first create your OAuth consent for the user you must request `offline_access` so you'll receive a refresh token.

- Azure AD issues short-lived access tokens (usually ~1 hour) and may rotate or expire refresh tokens (tenant policies often enforce ~90-day lifetime). This implementation will save any rotated `refresh_token` returned by Azure, so the stored token won't become stale as long as the process can refresh successfully.

- If you're running an unattended background service, we strongly recommend using the Microsoft Graph client-credentials (app-only) flow instead — it doesn't rely on delegated refresh tokens that can be revoked/rotated by policies.

How the code behaves now:

- Before sending mail it ensures a valid access token. If the cached access token is expired the code performs a refresh-token exchange against the Azure token endpoint.

- When Azure returns a new `refresh_token` (rotation) the code writes it back to `oauth_config.json` so subsequent runs use the newest refresh token.

If you need a new refresh token manually or you didn't request `offline_access`, perform the authorization flow in the Azure portal and exchange the authorization code for tokens (see Microsoft docs for "OAuth2 authorization code flow v2").

Implementation note: the OAuth token exchange and persistence logic now lives in `oauth.js`. `email.js` imports `getAccessToken()` and `getOAuthConfig()` from `oauth.js` and only focuses on composing/sending the message. Keep `oauth_config.json` at the same path so `oauth.js` can read and persist tokens.

## Windows Scheduled Task

1. [Node.js](https://nodejs.org/en/download) installed
2. Create a Windows Scheduled Task
3. Set `Program/script` to `powershell`
4. `Add arguments (optional)`: `cd '{path_to_folder}\task-fail-alert' | node index.js`
