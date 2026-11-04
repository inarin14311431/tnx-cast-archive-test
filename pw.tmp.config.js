import base from "./playwright.config.js";
import { devices } from "@playwright/test";
export default { ...base, reporter: [["list"]], projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 }, launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] } } }] };
