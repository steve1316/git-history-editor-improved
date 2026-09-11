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
})
