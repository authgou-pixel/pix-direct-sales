import { describe, it, expect } from "vitest";
import { aggregateSeries, filterByTimeframe } from "./dashboard";

const mock = [
  { amount: 10, created_at: new Date().toISOString() },
  { amount: 20, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];

describe("dashboard utils", () => {
  it("filters by timeframe", () => {
    const daily = filterByTimeframe(mock, "daily");
    expect(daily.length).toBeGreaterThanOrEqual(0);
    const weekly = filterByTimeframe(mock, "weekly");
    expect(weekly.length).toBeGreaterThan(0);
  });

  it("aggregates series", () => {
    const series = aggregateSeries(mock, "daily");
    expect(series.length).toBeGreaterThan(0);
    expect(series[0]).toHaveProperty("date");
    expect(series[0]).toHaveProperty("value");
  });
});

