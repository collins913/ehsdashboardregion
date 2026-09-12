import { describe, expect, it } from "vitest";
import { mockStores } from "@/data/mock/stores";
import { resolveActionStore } from "./resolve-action-store";

describe("Action Store Resolution", () => {
  it("uses a unique TRTID and validates a matching English name", () => {
    const result = resolveActionStore(
      {
        trtid: mockStores[0].trtid,
        storeNameEn: mockStores[0].storeNameEn,
      },
      mockStores,
    );

    expect(result).toMatchObject({
      kind: "RESOLVED",
      store: { trtid: mockStores[0].trtid },
    });
  });

  it("falls back to a unique English name when TRTID cannot resolve", () => {
    const result = resolveActionStore(
      { trtid: "MISSING", storeNameEn: mockStores[1].storeNameEn },
      mockStores,
    );

    expect(result).toMatchObject({
      kind: "RESOLVED",
      store: { trtid: mockStores[1].trtid },
    });
  });

  it("reports a conflict instead of silently choosing TRTID", () => {
    expect(
      resolveActionStore(
        {
          trtid: mockStores[0].trtid,
          storeNameEn: mockStores[1].storeNameEn,
        },
        mockStores,
      ),
    ).toEqual({ kind: "CONFLICT" });
  });

  it("reports unresolved missing references", () => {
    expect(
      resolveActionStore({ storeNameEn: "Missing Store" }, mockStores),
    ).toEqual({ kind: "UNRESOLVED" });
  });
});
