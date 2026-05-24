import { describe, expect, it } from "vitest";
import manifest from "../../public/manifest.json";

const ASCII_TEXT_RE = /^[\x20-\x7E]+$/;

describe("project metadata", () => {
  it("keeps PWA metadata ASCII-safe for install surfaces", () => {
    expect(manifest.name).toMatch(ASCII_TEXT_RE);
    expect(manifest.short_name).toMatch(ASCII_TEXT_RE);
    expect(manifest.description).toMatch(ASCII_TEXT_RE);
  });
});
