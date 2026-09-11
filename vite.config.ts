import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
    base: "/git-history-editor-improved/",
    plugins: [react()],
    test: {
        globals: true,
        environment: "node",
    },
})
