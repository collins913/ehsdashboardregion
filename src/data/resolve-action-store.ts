import type { StoreMasterData, StoreReference } from "@/types/ehs";

export type ActionStoreResolution =
  | { kind: "RESOLVED"; store: StoreMasterData }
  | { kind: "CONFLICT" }
  | { kind: "UNRESOLVED" };

function uniqueStore(
  stores: readonly StoreMasterData[],
  predicate: (store: StoreMasterData) => boolean,
): StoreMasterData | null {
  const matches = stores.filter(predicate);

  return matches.length === 1 ? matches[0] : null;
}

export function resolveActionStore(
  reference: StoreReference,
  stores: readonly StoreMasterData[],
): ActionStoreResolution {
  const storeNameEn =
    "storeNameEn" in reference ? reference.storeNameEn : undefined;

  if ("trtid" in reference) {
    const trtidStore = uniqueStore(
      stores,
      (store) => store.trtid === reference.trtid,
    );

    if (trtidStore !== null) {
      if (storeNameEn === undefined) {
        return { kind: "RESOLVED", store: trtidStore };
      }

      const englishNameStore = uniqueStore(
        stores,
        (store) => store.storeNameEn === storeNameEn,
      );

      return englishNameStore?.trtid === trtidStore.trtid
        ? { kind: "RESOLVED", store: trtidStore }
        : { kind: "CONFLICT" };
    }
  }

  if (storeNameEn !== undefined) {
    const englishNameStore = uniqueStore(
      stores,
      (store) => store.storeNameEn === storeNameEn,
    );

    if (englishNameStore !== null) {
      return { kind: "RESOLVED", store: englishNameStore };
    }
  }

  return { kind: "UNRESOLVED" };
}
