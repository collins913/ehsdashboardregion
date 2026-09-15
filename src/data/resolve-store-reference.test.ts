import { describe, expect, it } from "vitest";
import { mockStores } from "@/data/mock/stores";
import {
  createStoreReferenceResolver,
  resolveStoreReference,
} from "./resolve-store-reference";

describe("Store Reference Resolution", () => {
  it("uses a unique TRTID and validates a matching English name", () => {
    const result = resolveStoreReference(
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
    const result = resolveStoreReference(
      { trtid: "MISSING", storeNameEn: mockStores[1].storeNameEn },
      mockStores,
    );

    expect(result).toMatchObject({
      kind: "RESOLVED",
      store: { trtid: mockStores[1].trtid },
    });
  });

  it("keeps a unique TRTID resolved when the raw English name is historical", () => {
    const renamedStore = {
      ...mockStores[0],
      storeNameEn: "Current New Store Name",
    };
    const result = resolveStoreReference(
      {
        trtid: renamedStore.trtid,
        storeNameEn: "Historical Old Store Name",
      },
      [renamedStore, ...mockStores.slice(1)],
    );

    expect(result).toEqual({ kind: "RESOLVED", store: renamedStore });
  });

  it("reports a conflict instead of silently choosing TRTID", () => {
    expect(
      resolveStoreReference(
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
      resolveStoreReference({ storeNameEn: "Missing Store" }, mockStores),
    ).toEqual({ kind: "UNRESOLVED" });
  });

  it("keeps prepared lookup resolution equivalent to the direct resolver", () => {
    const resolvePrepared = createStoreReferenceResolver(mockStores);
    const references = [
      { trtid: mockStores[0].trtid },
      { trtid: "MISSING", storeNameEn: mockStores[1].storeNameEn },
      { storeNameCn: mockStores[2].storeNameCn },
      { storeNameEn: "Missing Store" },
      { trtid: mockStores[0].trtid, storeNameEn: mockStores[1].storeNameEn },
    ] as const;

    for (const reference of references) {
      expect(resolvePrepared(reference)).toEqual(
        resolveStoreReference(reference, mockStores),
      );
    }
  });
});
