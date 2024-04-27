import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true, // Run tests in files in parallel
    forbidOnly: !!process.env.CI, // Fail the build on CI if you accidentally left test.only in the source code.
    retries: process.env.CI ? 2 : 0, // Retry on CI only
    workers: process.env.CI ? 1 : undefined, // Opt out of parallel tests on CI.
    outputDir: ".playwright/test-results",
    reporter: [["html", { open: "never", outputFolder: ".playwright/report" }]],

    use: {
        baseURL: "http://localhost:6521", // Base URL to use in actions like `await page.goto('/')`
        trace: "on-first-retry", // Collect trace when retrying the failed test
        //screenshot: 'only-on-failure',
        viewport: { width: 1000, height: 1000 },
        actionTimeout: 5000, // by default something like "click" never times out, making us wait for the whole test 30 sec timeout before failing
        locale: "en-GB",
        timezoneId: "Europe/London",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }, // launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] }
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
    ],
});
