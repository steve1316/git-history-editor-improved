import { describe, expect, it } from "vitest"
import { chooseHeredocDelimiter, pythonBytes, shellSingleQuote } from "./escape"

describe("pythonBytes", () => {
    it("wraps plain text in a bytes literal", () => {
        expect(pythonBytes("Fix typo")).toBe('b"Fix typo"')
    })

    it("escapes double quotes", () => {
        expect(pythonBytes('Add "export" tab')).toBe('b"Add \\"export\\" tab"')
    })

    it("escapes backslashes", () => {
        expect(pythonBytes("path\\to\\thing")).toBe('b"path\\\\to\\\\thing"')
    })

    it("escapes newlines, carriage returns, and tabs", () => {
        expect(pythonBytes("a\nb\rc\td")).toBe('b"a\\nb\\rc\\td"')
    })

    it("leaves shell metacharacters alone, because the heredoc is quoted", () => {
        expect(pythonBytes("cost $5 and `date` and 'quote'")).toBe("b\"cost $5 and `date` and 'quote'\"")
    })

    it("escapes non-ASCII as UTF-8 byte escapes so the output stays pure ASCII", () => {
        expect(pythonBytes("caf\u00e9")).toBe('b"caf\\xc3\\xa9"')
    })

    it("escapes control characters", () => {
        expect(pythonBytes("a\u0000b\u001fc")).toBe('b"a\\x00b\\x1fc"')
    })

    it("produces output containing no characters outside printable ASCII", () => {
        const result = pythonBytes("mixed \u00e9\u4e2d text")
        expect(/^[\x20-\x7e]*$/.test(result)).toBe(true)
    })

    it("escapes an astral-plane character as its four UTF-8 bytes", () => {
        expect(pythonBytes("\u{1f600}")).toBe('b"\\xf0\\x9f\\x98\\x80"')
    })

    it("emits pure printable ASCII for any input", () => {
        for (let i = 0; i < 2000; i++) {
            const input = Array.from({ length: 8 }, () => String.fromCodePoint(1 + Math.floor(Math.random() * 0x2fffe))).join("")
            expect(pythonBytes(input)).toMatch(/^b"[\x20-\x7e]*"$/)
        }
    })
})

describe("chooseHeredocDelimiter", () => {
    it("uses the default when the payload does not contain it", () => {
        expect(chooseHeredocDelimiter("nothing special here")).toBe("GHE_EOF")
    })

    it("picks a different delimiter when the default appears as its own line", () => {
        expect(chooseHeredocDelimiter("before\nGHE_EOF\nafter")).toBe("GHE_EOF_1")
    })

    it("keeps going until it finds an unused delimiter", () => {
        expect(chooseHeredocDelimiter("GHE_EOF\nGHE_EOF_1\nGHE_EOF_2")).toBe("GHE_EOF_3")
    })

    it("ignores the delimiter appearing mid-line, which cannot terminate a heredoc", () => {
        expect(chooseHeredocDelimiter("x GHE_EOF x")).toBe("GHE_EOF")
    })

    it("accepts a custom base, which the filter-branch generator needs for its nested heredoc", () => {
        expect(chooseHeredocDelimiter("nothing", "GHE_MSG")).toBe("GHE_MSG")
        expect(chooseHeredocDelimiter("GHE_MSG", "GHE_MSG")).toBe("GHE_MSG_1")
    })
})

describe("shellSingleQuote", () => {
    it("wraps plain text in single quotes", () => {
        expect(shellSingleQuote("Jane Doe")).toBe("'Jane Doe'")
    })

    it("closes, escapes, and reopens around an embedded single quote", () => {
        expect(shellSingleQuote("it's")).toBe("'it'\\''s'")
    })

    it("leaves every other metacharacter inert inside the quotes", () => {
        expect(shellSingleQuote('$X `cmd` "q" \\')).toBe("'$X `cmd` \"q\" \\'")
    })
})
