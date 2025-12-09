import fs from "fs-extra";
import https from "https";
import path from "path";
import { URL } from "url";

// NOTE: same external path as before — keep this path if you rely on that layout
const OAUTH_CONFIG_PATH = path.resolve("C:/_Projects/_oauth_config/oauth_config.json");

// Load OAuth data (mailbox, tenantId, applicationId, clientSecret, refreshToken etc.)
let emailOAuth = await fs.readJson(OAUTH_CONFIG_PATH);

// Small in-process cache for access token and expiry
let cachedAccessToken = emailOAuth.accessToken || null;
let cachedAccessTokenExpiresAt = emailOAuth.accessTokenExpiresAt || 0; // epoch ms

// Helper: if access token still valid (10s safety), return it
function accessTokenValid() {
	return cachedAccessToken && Date.now() + 10000 < cachedAccessTokenExpiresAt;
}

// Exchange the refresh token for new tokens using Azure token endpoint (no external libs)
async function exchangeRefreshToken(refreshToken) {
	const body = new URLSearchParams({
		grant_type: "refresh_token",
		client_id: emailOAuth.applicationId,
		client_secret: emailOAuth.clientSecret,
		refresh_token: refreshToken,
		// include offline_access to emphasize we want long-lived refresh tokens
		scope: emailOAuth.scope || "offline_access openid profile https://outlook.office365.com/.default",
	}).toString();

	const url = new URL(emailOAuth.accessUrl || `https://login.microsoftonline.com/${emailOAuth.tenantId}/oauth2/v2.0/token`);

	return new Promise((resolve, reject) => {
		const opts = {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
		};

		const req = https.request(url, opts, (res) => {
			let raw = "";
			res.on("data", (c) => (raw += c));
			res.on("end", () => {
				try {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						const json = JSON.parse(raw);
						resolve(json);
					} else {
						return reject(new Error(`Token endpoint returned ${res.statusCode}: ${raw}`));
					}
				} catch (err) {
					reject(err);
				}
			});
		});

		req.on("error", (err) => reject(err));
		req.write(body);
		req.end();
	});
}

// Acquire a fresh access token if we don't have a valid one; persist rotated refresh tokens
export async function getAccessToken() {
	if (accessTokenValid()) return cachedAccessToken;

	if (!emailOAuth.refreshToken) {
		throw new Error("No refreshToken configured in oauth_config.json. Please (re)authorize with offline_access scope.");
	}

	let tokenResp;
	try {
		tokenResp = await exchangeRefreshToken(emailOAuth.refreshToken);
	} catch (err) {
		// If refresh fails and we still have a cached valid token, use it.
		if (accessTokenValid()) {
			console.warn("Refresh failed but cached access token still valid, continuing using cached token:", err.message);
			return cachedAccessToken;
		}
		// otherwise propagate the error so caller knows auth failed
		throw err;
	}

	if (!tokenResp.access_token) throw new Error("Token endpoint did not return access_token");

	// update cache
	cachedAccessToken = tokenResp.access_token;
	const expiresIn = tokenResp.expires_in ? Number(tokenResp.expires_in) : 3600; // s
	cachedAccessTokenExpiresAt = Date.now() + expiresIn * 1000;

	console.log("Access token expires in " + expiresIn + " seconds");

	// If the provider returned a new refresh_token (rotation), update stored config
	if (tokenResp.refresh_token && tokenResp.refresh_token !== emailOAuth.refreshToken) {
		emailOAuth.refreshToken = tokenResp.refresh_token;
		// Persist additional metadata optionally (accessToken and expiry) so restarts can reuse short-lived token
		emailOAuth.accessToken = cachedAccessToken;
		emailOAuth.accessTokenExpiresAt = cachedAccessTokenExpiresAt;

		// write file (safe update)
		try {
			await fs.writeJson(OAUTH_CONFIG_PATH, emailOAuth, { spaces: 2 });
			console.log("Saved rotated refresh_token and access token to oauth_config.json");
		} catch (err) {
			console.warn("Failed to write updated oauth_config.json", err);
		}
	} else {
		// We may still want to persist the short-lived access token/expiry so a restart doesn't force immediate refresh
		emailOAuth.accessToken = cachedAccessToken;
		emailOAuth.accessTokenExpiresAt = cachedAccessTokenExpiresAt;
		try {
			await fs.writeJson(OAUTH_CONFIG_PATH, emailOAuth, { spaces: 2 });
		} catch (e) {
			/* non fatal */
		}
	}

	return cachedAccessToken;
}

// Export the config object for other modules to use (caller should not mutate)
export function getOAuthConfig() {
	return emailOAuth;
}

// Also export the path in case the consumer wants to reference or re-authorize
export const configPath = OAUTH_CONFIG_PATH;
