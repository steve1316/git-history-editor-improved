import { Box, Paper } from "@mui/material"
import { MONO_FONT } from "../../theme"

/** Props for `ScriptBlock`. */
interface ScriptBlockProps {
    /** The generated script. */
    script: string
}

/**
 * Displays the generated script. Rendered as preformatted text rather than an editable field, because editing it here would silently
 * diverge from the diff above.
 *
 * @param props Component props.
 * @returns The script block.
 */
export default function ScriptBlock({ script }: ScriptBlockProps) {
    return (
        <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
            <Box component="pre" sx={{ m: 0, p: 2, fontFamily: MONO_FONT, fontSize: 12.5, lineHeight: 1.6, overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                {script}
            </Box>
        </Paper>
    )
}
