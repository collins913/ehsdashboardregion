export const mockPeople = [
  "Sanfeng Zhang（张 三丰）",
  "Ming LI（李 明）",
  "Wei Chen（陈 伟）",
  "Xiaoyu WANG（王 晓宇）",
  "Ziyang Zhao（赵 子阳）",
  "Kongming Zhuge（诸葛 孔明）",
  "Jing Ouyang（欧阳 静）",
  "Haoran Liu（刘 浩然）",
  "Yue SUN（孙 悦）",
  "Yiming Zhou（周 一鸣）",
  "Rui Huang（黄 睿）",
  "Xinyi Wu（吴 欣怡）",
] as const;

export function mockPersonAt(index: number): string {
  const normalizedIndex =
    ((index % mockPeople.length) + mockPeople.length) % mockPeople.length;

  return mockPeople[normalizedIndex];
}
