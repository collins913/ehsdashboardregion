import { describe, expect, it } from "vitest";
import { mockPeople, mockPersonAt } from "./people";
import { mockStores } from "./stores";

const expectedIdentityAndOwnership = [
  ["TEST-001", "北辰区", "北辰一部", mockPersonAt(0), mockPersonAt(6)],
  ["TEST-002", "北辰区", "北辰一部", mockPersonAt(1), mockPersonAt(7)],
  ["TEST-003", "北辰区", "北辰二部", null, mockPersonAt(8)],
  ["TEST-004", "北辰区", "北辰二部", mockPersonAt(3), mockPersonAt(9)],
  ["TEST-005", "南屿区", "南屿一部", mockPersonAt(4), mockPersonAt(10)],
  ["TEST-006", "南屿区", "南屿一部", mockPersonAt(5), mockPersonAt(11)],
  ["TEST-007", "南屿区", "南屿二部", mockPersonAt(6), mockPersonAt(0)],
  ["TEST-008", "南屿区", "南屿二部", mockPersonAt(7), mockPersonAt(1)],
  ["TEST-009", "西岭区", "西岭一部", mockPersonAt(8), mockPersonAt(2)],
  ["TEST-010", "西岭区", "西岭一部", mockPersonAt(9), null],
  ["TEST-011", "西岭区", "西岭二部", mockPersonAt(10), mockPersonAt(4)],
  ["TEST-012", "西岭区", "西岭二部", mockPersonAt(11), mockPersonAt(5)],
] as const;

describe("Store Master mock", () => {
  it("keeps Store identity and ownership fields stable", () => {
    expect(
      mockStores.map(
        ({ trtid, region, area, manager, ehsAmbassador }) =>
          [trtid, region, area, manager, ehsAmbassador] as const,
      ),
    ).toEqual(expectedIdentityAndOwnership);
  });

  it("keeps Chinese and English display names unique", () => {
    expect(new Set(mockStores.map(({ storeNameCn }) => storeNameCn)).size).toBe(
      mockStores.length,
    );
    expect(new Set(mockStores.map(({ storeNameEn }) => storeNameEn)).size).toBe(
      mockStores.length,
    );
  });

  it("uses the shared deterministic people pool for Store ownership", () => {
    const knownPeople = new Set<string>(mockPeople);

    expect(
      mockStores.every(
        ({ manager, ehsAmbassador }) =>
          (manager === null || knownPeople.has(manager)) &&
          (ehsAmbassador === null || knownPeople.has(ehsAmbassador)) &&
          manager !== ehsAmbassador,
      ),
    ).toBe(true);
  });
});
