import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"

export default tseslint.config(
    { ignores: ["dist", "node_modules", "docs", ".superpowers"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: { "react-hooks": reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "no-restricted-imports": [
                "error",
                {
                    patterns: [{ group: ["**/store/**", "**/components/**", "react", "react-dom"], message: "src/core must stay free of React and of store/component imports." }],
                },
            ],
        },
    },
    {
        files: ["src/store/**/*.ts", "src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/*.{ts,tsx}"],
        rules: { "no-restricted-imports": "off" },
    },
)
