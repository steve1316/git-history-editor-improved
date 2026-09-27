import { describe, expect, it } from "vitest"
import { buildImportCommand } from "./importCommand"

describe("buildImportCommand", () => {
    it("emits all eight fields in the order the parser expects", () => {
        expect(buildImportCommand()).toBe('git log --pretty=format:"%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%B%x1e" | base64 | tr -d "\\n"')
    })

    it("applies a commit limit when one is given", () => {
        expect(buildImportCommand({ limit: 100 })).toContain("git log -100 --pretty=format:")
    })

    it("omits the limit when it is not a positive number", () => {
        expect(buildImportCommand({ limit: 0 })).toContain("git log --pretty=format:")
    })

    it("builds a single-line PowerShell command that encodes git's exact bytes and copies them", () => {
        expect(buildImportCommand({ shell: "powershell" })).toBe(
            '$f="$env:TEMP\\gitlog.tmp"; git -c safe.directory=* log --output="$f" --pretty=format:"%H%x1f%an%x1f%ae%x1f%aI%x1f%cn%x1f%ce%x1f%cI%x1f%B%x1e"; ' +
                'if ($LASTEXITCODE -eq 0) { [Convert]::ToBase64String([IO.File]::ReadAllBytes($f)) | Set-Clipboard; Remove-Item $f; "Copied to clipboard" }',
        )
    })

    it("applies a commit limit to the PowerShell command", () => {
        const command = buildImportCommand({ shell: "powershell", limit: 100 })
        expect(command).toContain("git -c safe.directory=* log -100 --output=")
        expect(command).not.toContain("\n")
    })
})
