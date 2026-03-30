import { describe, it, expect } from "vitest";
import { FixedClock, SystemClock } from "../src/clock/clock.js";

describe("FixedClock", () => {
  it("returns consistent timestamps", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    expect(clock.isoNow()).toBe("2026-03-29T12:00:00Z");
    expect(clock.dateStr()).toBe("2026-03-29");
    expect(clock.monthStr()).toBe("2026-03");
  });

  it("now() returns a Date object", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    expect(clock.now()).toBeInstanceOf(Date);
    expect(clock.now().toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });

  it("returns independent Date instances", () => {
    const clock = new FixedClock();
    const a = clock.now();
    const b = clock.now();
    expect(a).not.toBe(b);
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("SystemClock", () => {
  it("returns a valid ISO timestamp", () => {
    const clock = new SystemClock();
    const iso = clock.isoNow();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("dateStr matches YYYY-MM-DD", () => {
    const clock = new SystemClock();
    expect(clock.dateStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
