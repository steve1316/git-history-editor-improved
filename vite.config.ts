import { copyFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vitest/config"

/**
 * Copy the built `index.html` to `404.html` so GitHub Pages serves the app for unmatched paths instead of its own error page.
 *
 * @returns The Vite plugin.
 */
function spaFallback(): Plugin {
    return {
        name: "spa-fallback-404",
        closeBundle() {
            const dist = resolve(fileURLToPath(new URL(".", import.meta.url)), "dist")
            copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"))
        },
    }
}

export default defineConfig({
    base: "/git-history-editor-improved/",
    plugins: [react(), spaFallback()],
    test: {
        globals: true,
        environment: "node",
    },
})
