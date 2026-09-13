import { describe, expect, it } from "vitest";
import { mockStores } from "./stores";

const expectedIdentityAndOwnership = [
  ["TEST-001", "北辰区", "北辰一部", "测试经理甲", "测试专员甲"],
  ["TEST-002", "北辰区", "北辰一部", "测试经理乙", "测试专员乙"],
  ["TEST-003", "北辰区", "北辰二部", "测试经理丙", "测试专员丙"],
  ["TEST-004", "北辰区", "北辰二部", "测试经理丁", "测试专员丁"],
  ["TEST-005", "南屿区", "南屿一部", "测试经理戊", "测试专员戊"],
  ["TEST-006", "南屿区", "南屿一部", "测试经理己", "测试专员己"],
  ["TEST-007", "南屿区", "南屿二部", "测试经理庚", "测试专员庚"],
  ["TEST-008", "南屿区", "南屿二部", "测试经理辛", "测试专员辛"],
  ["TEST-009", "西岭区", "西岭一部", "测试经理壬", "测试专员壬"],
  ["TEST-010", "西岭区", "西岭一部", "测试经理癸", "测试专员癸"],
  ["TEST-011", "西岭区", "西岭二部", "测试经理子", "测试专员子"],
  ["TEST-012", "西岭区", "西岭二部", "测试经理丑", "测试专员丑"],
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
});
