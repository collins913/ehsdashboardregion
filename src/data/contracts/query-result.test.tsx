import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AsyncQueryFeedback } from "@/components/shared/async-query-feedback";
import { QueryError, queryErrorDigest, queryErrorMessage, queryFailure, unwrapQueryOutcome, type QueryErrorCode, type ErrorDiagnostics } from "./query-result";

describe("safe query failures", () => {
  it.each([
    ["AUTHENTICATION_REQUIRED", "登录状态已失效，请重新登录。"],
    ["ACCESS_DENIED", "当前账号无权查看所选范围。"],
    ["INVALID_QUERY_INPUT", "查询条件无效，请重新选择。"],
    ["SERVICE_UNAVAILABLE", "数据请求未能完成，具体原因待排查。请稍后重试。"],
  ] satisfies [QueryErrorCode, string][])('preserves %s through JSON transport and renders its safe message', (code, message) => {
    const failure = JSON.parse(JSON.stringify(queryFailure(new QueryError(code))));
    expect(failure).toEqual({ queryError: { code } });
    expect(() => unwrapQueryOutcome(failure)).toThrow(QueryError);
    const markup = renderToStaticMarkup(createElement(TooltipProvider, null, createElement(AsyncQueryFeedback, { status: "ERROR", errorCode: code })));
    expect(markup).toContain(code);
    expect(markup).not.toContain("NOT_AUTHORIZED");
  });

  it("does not expose exception messages or classify by message text", () => {
    for (const error of [new Error("private database password"), new Error("NOT_AUTHORIZED"), { code: "private-code" }]) {
      expect(queryFailure(error)).toEqual({ queryError: { code: "SERVICE_UNAVAILABLE" } });
    }
    const result = { availability: "CONFIRMED_EMPTY", items: [] };
    expect(unwrapQueryOutcome(result)).toBe(result);
  });

  it.each(["SERVER_QUERY", "CLIENT_REPORT"] as const)("labels the %s log ID correctly", (origin) => {
    const diagnostics: ErrorDiagnostics = { requestId: "confirmed-id", occurredAt: "2026-10-19T00:00:00Z", origin };
    const label = origin === "CLIENT_REPORT" ? "上报请求编号" : "查询请求编号";
    expect(queryErrorMessage("SERVICE_UNAVAILABLE", diagnostics)).toContain(`${label}：confirmed-id`);
    const markup = renderToStaticMarkup(createElement(TooltipProvider, null, createElement(AsyncQueryFeedback, { status: "ERROR", diagnostics })));
    expect(markup).toContain(label);
    expect(markup).toContain("confirmed-id");
  });

  it("keeps a valid framework digest without deriving one from error text", () => {
    expect(queryErrorDigest(Object.assign(new Error("private"), { digest: "123456" }))).toBe("123456");
    expect(queryErrorDigest(new Error("digest:123456"))).toBeUndefined();
    expect(queryErrorDigest({ digest: "private text\n" })).toBeUndefined();
  });
});
