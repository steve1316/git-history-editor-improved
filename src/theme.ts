import { createTheme, type Theme } from "@mui/material/styles"

/**
 * Build the application theme for one colour mode. Both modes are defined here so the toggle swaps a complete palette rather than patching one.
 *
 * @param mode The colour mode to build.
 * @returns The MUI theme.
 */
export function buildTheme(mode: "light" | "dark"): Theme {
    const dark = mode === "dark"

    return createTheme({
        palette: {
            mode,
            primary: { main: dark ? "#7aa2f7" : "#2f5fd0" },
            secondary: { main: dark ? "#f7a76c" : "#b8540d" },
            background: dark ? { default: "#12141c", paper: "#1a1d27" } : { default: "#f5f6fa", paper: "#ffffff" },
        },
        shape: { borderRadius: 8 },
        typography: {
            fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 14,
        },
        components: {
            MuiTableCell: {
                styleOverrides: {
                    root: { paddingTop: 4, paddingBottom: 4 },
                },
            },
            MuiButton: {
                defaultProps: { disableElevation: true },
            },
        },
    })
}

/** Monospace stack used for SHAs, commit messages, and generated scripts. */
export const MONO_FONT = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
