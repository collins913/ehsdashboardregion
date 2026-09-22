import { getCurrentIdentity } from "@/data/repositories/access/mock-identity.server";

export default function Forbidden() {
  const identity = getCurrentIdentity();
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-3 px-6">
    <h1 className="text-2xl font-semibold">暂无访问权限</h1>
    <p className="text-sm">当前账号：{identity.email}</p>
    <p className="text-sm text-muted-foreground">当前账号尚未配置 EHS Dashboard 访问范围。如需访问，请联系系统管理员。</p>
  </main>;
}
