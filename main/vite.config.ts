import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "url"
import fs from "fs";
import path from "path";
import process from "process";

export default defineConfig({
    server: {
        host: "::",
        port: 6521,
        strictPort: true,
    },
    resolve: {
        alias: [
            { find: "~", replacement: path.resolve(__dirname, "src") },
        ],
    },
    plugins: [
        react({
            jsxImportSource: "@emotion/react",
        }),
    ],
})
