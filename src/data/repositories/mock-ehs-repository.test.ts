import { describe, expect, it } from "vitest";
import { mockActionRecords } from "@/data/mock/actions";
import { parseActionStatus } from "@/data/parse-action-status";
import { mockEhsRepository } from "./mock-ehs-repository";

describe("Action source status parsing", () => {
  it("passes source Status values through the parser in the Repository", () => {
    const repositoryRecords = mockEhsRepository.listActionRecords();

    expect(repositoryRecords).toHaveLength(mockActionRecords.length);
    expect(repositoryRecords.map(({ Status }) => Status)).toEqual(
      mockActionRecords.map(({ Status }) => parseActionStatus(Status)),
    );
  });

  it("preserves an undocumented source Status as UNKNOWN", () => {
    expect(parseActionStatus("PendingReview")).toEqual({
      kind: "UNKNOWN",
      value: "PendingReview",
    });
  });
});
