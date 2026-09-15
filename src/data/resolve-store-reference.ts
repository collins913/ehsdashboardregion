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
  const storesByChineseName = new Map<string, StoreMasterData[]>();

  for (const store of stores) {
    addCandidate(storesByTrtid, store.trtid, store);
    addCandidate(storesByEnglishName, store.storeNameEn, store);
    addCandidate(storesByChineseName, store.storeNameCn, store);
  }

  return (reference) => {
    const storeNameEn =
      "storeNameEn" in reference ? reference.storeNameEn : undefined;

    if ("trtid" in reference) {
      const trtidStore = uniqueStore(storesByTrtid, reference.trtid);

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

    if ("storeNameCn" in reference) {
      const chineseNameStore = uniqueStore(
        storesByChineseName,
        reference.storeNameCn,
      );

      if (chineseNameStore !== null) {
        return { kind: "RESOLVED", store: chineseNameStore };
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
