import { describe, expect, it } from "vitest";
import type { WasteContractCategory, WasteContractRecord } from "@/types/ehs";
import {
  combineWasteContractResults,
  evaluateCarWashDrainagePermit,
  evaluateCombinedWasteContracts,
  evaluateDischargePermit,
  evaluateEia,
  evaluateEnvironmentalMonitoringAvailability,
  evaluateGeneralSolidWasteContracts,
  evaluateHazardousWasteContracts,
} from "./environment-rules";

const expiryPolicy = { referenceDate: "2026-09-10" };

function contract(
  contractCategory: WasteContractCategory,
  expiryDate: WasteContractRecord["expiryDate"],
): WasteContractRecord {
  return {
    storeReference: { trtid: "TEST-001" },
    contractCategory,
    supplierContractor: "Test",
    expiryDate,
  };
}

describe.each([
  [
    "Hazardous Waste Contract",
    evaluateHazardousWasteContracts,
    "Hazardous Waste Contract",
  ],
  [
    "General Solid Waste Contract",
    evaluateGeneralSolidWasteContracts,
    "General Solid Waste Contract",
  ],
] as const)("%s", (_name, evaluate, category) => {
  it("is ABNORMAL when no relevant contract exists", () => {
    expect(evaluate([], expiryPolicy)).toBe("ABNORMAL");
  });

  it("is ABNORMAL when any relevant contract is expired", () => {
    expect(
      evaluate(
        [contract(category, "2026-09-09"), contract(category, null)],
        expiryPolicy,
      ),
    ).toBe("ABNORMAL");
  });

  it("is NORMAL when all relevant contracts are valid", () => {
    expect(
      evaluate(
        [contract(category, "2026-09-10"), contract(category, "2027-01-01")],
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is UNDETERMINED when expiry is missing or malformed", () => {
    expect(evaluate([contract(category, null)], expiryPolicy)).toBe(
      "UNDETERMINED",
    );
    expect(
      evaluate(
        [contract(category, "2026-02-30" as WasteContractRecord["expiryDate"])],
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
  });
});

describe("Combined Waste Contract result", () => {
  it("is NORMAL only when both categories are NORMAL", () => {
    expect(combineWasteContractResults("NORMAL", "NORMAL")).toBe("NORMAL");
    expect(
      evaluateCombinedWasteContracts(
        [
          contract("Hazardous Waste Contract", "2027-01-01"),
          contract("General Solid Waste Contract", "2027-01-01"),
        ],
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is ABNORMAL when either category is ABNORMAL", () => {
    expect(combineWasteContractResults("ABNORMAL", "NORMAL")).toBe("ABNORMAL");
    expect(combineWasteContractResults("UNDETERMINED", "ABNORMAL")).toBe(
      "ABNORMAL",
    );
  });

  it("is UNDETERMINED when neither is abnormal and one is undetermined", () => {
    expect(combineWasteContractResults("UNDETERMINED", "NORMAL")).toBe(
      "UNDETERMINED",
    );
  });
});

describe("Car Wash / Drainage Permit", () => {
  it("is NORMAL when the Store has no Car Wash", () => {
    expect(
      evaluateCarWashDrainagePermit(
        { hasCarWash: false, hasDrainagePermit: null, permitExpiryDate: null },
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is ABNORMAL when Car Wash exists without a Drainage Permit", () => {
    expect(
      evaluateCarWashDrainagePermit(
        { hasCarWash: true, hasDrainagePermit: false, permitExpiryDate: null },
        expiryPolicy,
      ),
    ).toBe("ABNORMAL");
  });

  it("is ABNORMAL when the Drainage Permit is expired", () => {
    expect(
      evaluateCarWashDrainagePermit(
        {
          hasCarWash: true,
          hasDrainagePermit: true,
          permitExpiryDate: "2026-09-09",
        },
        expiryPolicy,
      ),
    ).toBe("ABNORMAL");
  });

  it("is NORMAL when the Drainage Permit is valid", () => {
    expect(
      evaluateCarWashDrainagePermit(
        {
          hasCarWash: true,
          hasDrainagePermit: true,
          permitExpiryDate: "2026-09-10",
        },
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is UNDETERMINED when required input is unknown", () => {
    expect(
      evaluateCarWashDrainagePermit(
        { hasCarWash: null, hasDrainagePermit: null, permitExpiryDate: null },
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
    expect(
      evaluateCarWashDrainagePermit(
        { hasCarWash: true, hasDrainagePermit: null, permitExpiryDate: null },
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
    expect(
      evaluateCarWashDrainagePermit(
        { hasCarWash: true, hasDrainagePermit: true, permitExpiryDate: null },
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
  });
});

describe("EIA", () => {
  it("covers Normal, Abnormal and Undetermined branches", () => {
    expect(evaluateEia({ eiaRequired: false, eiaInformation: null })).toBe(
      "NORMAL",
    );
    expect(evaluateEia({ eiaRequired: true, eiaInformation: null })).toBe(
      "ABNORMAL",
    );
    expect(evaluateEia({ eiaRequired: true, eiaInformation: "EIA record" })).toBe(
      "NORMAL",
    );
    expect(evaluateEia({ eiaRequired: null, eiaInformation: null })).toBe(
      "UNDETERMINED",
    );
  });
});

describe("Discharge Permit", () => {
  it("is NORMAL when a permit is not required", () => {
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: false,
          permitInformation: null,
          expiryDate: null,
        },
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is ABNORMAL when required permit information is absent", () => {
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: true,
          permitInformation: null,
          expiryDate: null,
        },
        expiryPolicy,
      ),
    ).toBe("ABNORMAL");
  });

  it("is ABNORMAL when a required permit is expired", () => {
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: true,
          permitInformation: "Permit",
          expiryDate: "2026-09-09",
        },
        expiryPolicy,
      ),
    ).toBe("ABNORMAL");
  });

  it("is NORMAL when a required permit exists and is valid", () => {
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: true,
          permitInformation: "Permit",
          expiryDate: "2026-09-10",
        },
        expiryPolicy,
      ),
    ).toBe("NORMAL");
  });

  it("is UNDETERMINED when required input is unknown", () => {
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: null,
          permitInformation: null,
          expiryDate: null,
        },
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
    expect(
      evaluateDischargePermit(
        {
          dischargePermitRequired: true,
          permitInformation: "Permit",
          expiryDate: null,
        },
        expiryPolicy,
      ),
    ).toBe("UNDETERMINED");
  });
});

describe("Environmental Monitoring availability", () => {
  it("returns NONE for no records and AVAILABLE otherwise", () => {
    expect(evaluateEnvironmentalMonitoringAvailability([])).toBe("NONE");
    expect(
      evaluateEnvironmentalMonitoringAvailability([
        { storeReference: { trtid: "TEST-001" } },
      ]),
    ).toBe("AVAILABLE");
  });
});
