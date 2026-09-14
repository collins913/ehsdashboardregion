import type { StoreMasterData, StoreReference } from "@/types/ehs";

export type StoreReferenceResolution =
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

export function resolveStoreReference(
  reference: StoreReference,
  stores: readonly StoreMasterData[],
): StoreReferenceResolution {
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

      const englishNameMatches = stores.filter(
        (store) => store.storeNameEn === storeNameEn,
      );

      if (englishNameMatches.length === 0) {
        return { kind: "RESOLVED", store: trtidStore };
      }

      return englishNameMatches.length === 1 &&
        englishNameMatches[0].trtid === trtidStore.trtid
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
