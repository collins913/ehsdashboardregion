import type {
  EnvironmentSourceValue,
  IsoDate,
  RawEnvironmentRecord,
  RawEnvironmentWasteContract,
  StoreMasterData,
} from "@/types/ehs";

const values: readonly EnvironmentSourceValue[] = ["有", "无", "不适用"];
const freeTexts = ["有", "缺失", "无", "依据属地要求暂不适用"] as const;

function wasteContracts(
  storeIndex: number,
  category: "危险废物" | "一般工业固体废物",
  count: number,
): readonly RawEnvironmentWasteContract[] {
  return Array.from({ length: count }, (_, contractIndex) => ({
    供应商名称: `${category}处置供应商 ${storeIndex + 1}-${contractIndex + 1}`,
    种类:
      category === "危险废物"
        ? contractIndex % 2 === 0
          ? "废油漆渣"
          : "废活性炭"
        : contractIndex % 2 === 0
          ? "废纸及包装物"
          : "一般工业固废",
    有效期起: `2026-${String((contractIndex % 6) + 1).padStart(2, "0")}-01` as IsoDate,
    有效期止: `2027-${String((contractIndex % 6) + 1).padStart(2, "0")}-01` as IsoDate,
  }));
}

// Small source-like detail fixture; references come from the existing Store Master.
export function createEnvironmentMockRecords(
  stores: readonly StoreMasterData[],
  storeLimit = 12,
): readonly RawEnvironmentRecord[] {
  return stores.slice(0, storeLimit).map((store, index) => ({
    TRTID: store.trtid,
    "English Store Name": store.storeNameEn,
    环境影响评价: {
      环境影响评价: freeTexts[index % freeTexts.length],
      总量要求: {
        "气-颗粒物": index % 4 === 0 ? null : 1.25 + index,
        "气-VOCs": index % 3 === 0 ? null : 2.5 + index,
        "水-氨氮": index % 5 === 0 ? null : 0.35 + index,
        "水-总氮": index % 4 === 1 ? null : 0.75 + index,
        "水-总磷": index % 3 === 1 ? null : 0.2 + index,
        "水-CODcr": index % 5 === 1 ? null : 3.5 + index,
      },
    },
    排污许可: {
      排污许可: freeTexts[(index + 1) % freeTexts.length],
      执行报告: ["季报", "年报", "季报+年报", "按属地要求提交"][index % 4],
      编号: `POLLUTION-${String(index + 1).padStart(4, "0")}`,
      有效期起: "2026-01-01",
      有效期止: index % 4 === 0 ? null : "2030-12-31",
      总量要求: {
        产能: index % 3 === 0 ? null : `${1200 + index * 10}`,
        涂料批复用量: index % 4 === 1 ? null : 80 + index,
      },
      备注: index % 3 === 0 ? "按批复要求执行并保留报告。" : null,
    },
    排水许可: {
      洗车: freeTexts[(index + 2) % freeTexts.length],
      排水许可: freeTexts[(index + 3) % freeTexts.length],
      有效期起: index % 4 === 2 ? null : "2026-03-01",
      有效期止: index % 4 === 2 ? null : "2029-02-28",
      备注: index % 2 === 0 ? "排水许可信息按源记录展示。" : null,
    },
    环境预案: {
      突发环境事件应急预案备案情况: freeTexts[index % freeTexts.length],
      备案编号: index % 3 === 0 ? null : `ERP-${String(index + 1).padStart(4, "0")}`,
      有效期起: index % 3 === 0 ? null : "2026-05-01",
      有效期止: index % 3 === 0 ? null : "2029-04-30",
      备注: index % 2 === 0 ? "当前信息来自环境预案源记录。" : null,
    },
    监测: values[(index + 1) % 3],
    废弃物合同: {
      危险废物处置合同: wasteContracts(index, "危险废物", index % 4),
      一般工业固体废物处置合同: wasteContracts(
        index,
        "一般工业固体废物",
        (index + 1) % 4,
      ),
    },
  }));
}
