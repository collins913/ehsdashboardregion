import type { Identity } from "@/data/contracts/access";
import { PageContainer } from "@/components/shared/page-container";

export function AccessForbidden({ identity }: { identity: Identity }) {
  return <PageContainer><div role="alert" className="space-y-2 rounded-lg border p-6"><h2 className="text-lg font-semibold">无权访问权限管理</h2><p className="text-sm text-muted-foreground">当前账号：{identity.email}</p><p className="text-sm text-muted-foreground">此页面仅全局管理员可访问。</p></div></PageContainer>;
}
