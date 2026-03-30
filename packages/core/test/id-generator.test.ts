import { describe, it, expect } from "vitest";
import { DefaultIdGenerator, DeterministicIdGenerator } from "../src/id/generator.js";
import { FixedClock } from "../src/clock/clock.js";

describe("DefaultIdGenerator", () => {
  it("generates IDs with correct prefix and date", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    const gen = new DefaultIdGenerator(clock);
    expect(gen.next("event")).toBe("evt-2026-03-29-001");
    expect(gen.next("event")).toBe("evt-2026-03-29-002");
    expect(gen.next("proposal")).toBe("prop-2026-03-29-001");
  });

  it("increments counters independently per prefix", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    const gen = new DefaultIdGenerator(clock);
    gen.next("event");
    gen.next("fact");
    gen.next("event");
    expect(gen.next("event")).toBe("evt-2026-03-29-003");
    expect(gen.next("fact")).toBe("fact-2026-03-29-002");
  });

  it("seeds from existing IDs", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    const gen = new DefaultIdGenerator(clock);
    gen.seedFromIds(["evt-2026-03-29-005", "evt-2026-03-29-003", "prop-2026-03-29-002"]);
    expect(gen.next("event")).toBe("evt-2026-03-29-006");
    expect(gen.next("proposal")).toBe("prop-2026-03-29-003");
  });

  it("pads IDs to 3 digits", () => {
    const clock = new FixedClock("2026-03-29T12:00:00Z");
    const gen = new DefaultIdGenerator(clock);
    expect(gen.next("value")).toBe("val-2026-03-29-001");
  });
});

describe("DeterministicIdGenerator", () => {
  it("generates test IDs with correct prefix", () => {
    const gen = new DeterministicIdGenerator();
    expect(gen.next("event")).toBe("evt-test-001");
    expect(gen.next("event")).toBe("evt-test-002");
    expect(gen.next("proposal")).toBe("prop-test-001");
  });

  it("increments independently per prefix", () => {
    const gen = new DeterministicIdGenerator();
    gen.next("fact");
    gen.next("value");
    gen.next("fact");
    expect(gen.next("fact")).toBe("fact-test-003");
    expect(gen.next("value")).toBe("val-test-002");
  });
});
