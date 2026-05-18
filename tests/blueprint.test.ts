import { describe, expect, it } from "vitest";
import { buildBlueprint } from "../src/blueprint.js";

describe("buildBlueprint", () => {
  it("uses exact default domain distribution for 100", () => {
    const plan = buildBlueprint(100);
    expect(plan.domains.map((d) => d.count)).toEqual([18, 23, 12, 17, 18, 12]);
    expect(plan.itemTypes.case_study).toBe(16);
  });

  it("scales to 30 and includes required types", () => {
    const plan = buildBlueprint(30);
    expect(plan.totalQuestions).toBe(30);
    expect(plan.itemTypes.case_study).toBeGreaterThan(0);
    expect(plan.itemTypes.multi_select).toBeGreaterThan(0);
    expect(plan.itemTypes.code_or_config_artifact).toBeGreaterThan(0);
  });

  it("scales to 70 with 3 case studies", () => {
    const plan = buildBlueprint(70);
    expect(plan.caseStudyCount).toBe(3);
  });
});
