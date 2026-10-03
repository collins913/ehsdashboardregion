import type { StoreMasterData, StoreReference } from "@/types/ehs";

export type StoreReferenceResolution =
  | { kind: "RESOLVED"; store: StoreMasterData }
  | { kind: "CONFLICT" }
  | { kind: "UNRESOLVED" };

export type StoreReferenceResolver = (
  reference: StoreReference,
) => StoreReferenceResolution;

function addCandidate(
  index: Map<string, StoreMasterData[]>,
  key: string,
  store: StoreMasterData,
) {
  const candidates = index.get(key);
  if (candidates) {
    candidates.push(store);
  } else {
    index.set(key, [store]);
  }
}

function uniqueStore(
  index: ReadonlyMap<string, readonly StoreMasterData[]>,
  key: string,
): StoreMasterData | null {
  const matches = index.get(key) ?? [];

  return matches.length === 1 ? matches[0] : null;
}

export function createStoreReferenceResolver(
  stores: readonly StoreMasterData[],
): StoreReferenceResolver {
  const storesByTrtid = new Map<string, StoreMasterData[]>();
  const storesByEnglishName = new Map<string, StoreMasterData[]>();

  for (const store of stores) {
    addCandidate(storesByTrtid, store.trtid, store);
    addCandidate(storesByEnglishName, store.storeNameEn, store);
  }

  return (reference) => {
    const rawStoreNameEn =
      "storeNameEn" in reference ? reference.storeNameEn : undefined;
    const storeNameEn =
      typeof rawStoreNameEn === "string" && rawStoreNameEn.trim() !== ""
        ? rawStoreNameEn
        : undefined;
    const trtid =
      "trtid" in reference && reference.trtid.trim() !== ""
        ? reference.trtid
        : undefined;

    if (trtid !== undefined) {
      const trtidStore = uniqueStore(storesByTrtid, trtid);

      if (trtidStore !== null) {
        if (storeNameEn === undefined) {
          return { kind: "RESOLVED", store: trtidStore };
        }

        const englishNameMatches = storesByEnglishName.get(storeNameEn) ?? [];

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
      const englishNameStore = uniqueStore(storesByEnglishName, storeNameEn);

      if (englishNameStore !== null) {
        return { kind: "RESOLVED", store: englishNameStore };
      }
    }

    return { kind: "UNRESOLVED" };
  };
}

export function resolveStoreReference(
  reference: StoreReference,
  stores: readonly StoreMasterData[],
): StoreReferenceResolution {
  return createStoreReferenceResolver(stores)(reference);
}
