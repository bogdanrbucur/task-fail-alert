import fs from "fs-extra";
import { exec } from "node:child_process";
import util from "node:util";
import mailer from "./email.js";

// Use exec as a promise
const execPromise = util.promisify(exec);
const config = await fs.readJson("config.json");
const acceptableResults = ["267009", "0"]; // 267009=running, 0=success
const failedTasks = [];

// Check the status of each task
for (const task of config.taskNames) {
	const { error, stdout, stderr } = await execPromise(`schtasks /query /v /fo LIST /tn "${task}"`);

	if (error) {
		console.error(`exec error: ${error}`);
		continue;
	}

	const lastResultLine = stdout.split("\n").find((line) => line.includes("Last Result"));
	const lastResult = lastResultLine.split(": ")[1].trim();
	console.log(`${task} last Run Result: ${lastResult}`);

	if (!acceptableResults.includes(lastResult)) {
		failedTasks.push(task);
	}
}

console.log("Failed tasks: ", failedTasks);

if (failedTasks.length === 0) {
	console.log("All tasks ran successfully.");
} else await mailer(config.emailRecipients, failedTasks, config.emailAuth, config.emailHost, config.emailPort);
