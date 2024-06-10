# Task Fail Alert

Script to monitor Windows Scheduled Tasks and send an email alert using on-prem Exchange if a task fails.

## Setup

1. `npm i` to install dependencies
2. `node index.js` to run in console

### config.json

Use `taskNames` array to add the task names to monitor.

- `taskNames`: array of task names
- `emailRecipients`: string of recipients of the email notification in format `"user1@email.com; user2@email.com"`
- `emailAuth`: object containing user and password for the email account used for sending the notification. Format: `{ "user": "bogdan-it", "pass": "123456"}`
- `emailHost`: string hostname of the email server
- `emailPort`: SMTP port of the email server

## Windows Scheduled Task

1. [Node.js](https://nodejs.org/en/download) installed
2. Create a Windows Scheduled Task
3. Set `Program/script` to `powershell`
4. `Add arguments (optional)`: `cd '{path_to_folder}\task-fail-alert' | node index.js`
