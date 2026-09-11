import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import { AppBar, Alert, Box, Container, CssBaseline, IconButton, Step, StepButton, Stepper, ThemeProvider, Toolbar, Tooltip, Typography, useMediaQuery } from "@mui/material"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon"
import { useMemo } from "react"
import EditStep from "./components/edit/EditStep"
import ExportStep from "./components/export/ExportStep"
import ImportStep from "./components/import/ImportStep"
import { useUndoRedoShortcuts } from "./hooks/useUndoRedoShortcuts"
import { isPersistenceAvailable, useStore } from "./store"
import { buildTheme } from "./theme"

const STEP_LABELS = ["Import", "Edit", "Export"]

/**
 * Root application component. Owns the theme, the date picker localisation context, and the three-step navigation.
 *
 * @returns The application tree.
 */
export default function App() {
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)")
    const themeMode = useStore((s) => s.themeMode)
    const setThemeMode = useStore((s) => s.setThemeMode)
    const step = useStore((s) => s.step)
    const setStep = useStore((s) => s.setStep)
    const hasCommits = useStore((s) => s.current.length > 0)

    useUndoRedoShortcuts()

    const resolved = themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode
    const theme = useMemo(() => buildTheme(resolved), [resolved])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterLuxon}>
                <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Toolbar>
                        <Typography variant="h6" component="h1" sx={{ flex: 1 }}>
                            Git History Editor
                        </Typography>
                        <Tooltip title={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
                            <IconButton aria-label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setThemeMode(resolved === "dark" ? "light" : "dark")}>
                                {resolved === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>

                <Container maxWidth={false} sx={{ py: 3 }}>
                    <Stepper nonLinear activeStep={step - 1} sx={{ mb: 3 }}>
                        {STEP_LABELS.map((label, index) => (
                            <Step key={label} completed={false} disabled={index > 0 && !hasCommits}>
                                <StepButton onClick={() => setStep((index + 1) as 1 | 2 | 3)}>{label}</StepButton>
                            </Step>
                        ))}
                    </Stepper>

                    {!isPersistenceAvailable() && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Your browser is blocking local storage, so this session will not survive a refresh. Finish and copy your script before closing the tab.
                        </Alert>
                    )}

                    <Box>{step === 1 ? <ImportStep /> : step === 2 ? <EditStep /> : <ExportStep />}</Box>
                </Container>
            </LocalizationProvider>
        </ThemeProvider>
    )
}
