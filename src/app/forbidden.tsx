import { Coffee, DoorOpen, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { applicationName, routes } from "@/config/navigation";
import { getVerifiedServerPrincipal } from "@/data/server/identity-provider.server";

export default async function Forbidden() {
  const principal = await getVerifiedServerPrincipal().catch(() => null);
  const email = principal?.verifiedEmail ?? "未验证身份";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-6 py-12">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4" />
        {applicationName}
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div aria-hidden="true" className="relative mb-2 flex size-24 items-center justify-center rounded-2xl bg-muted">
              <DoorOpen className="size-12 text-muted-foreground" />
              <span className="absolute -right-3 -bottom-2 flex size-10 items-center justify-center rounded-full border bg-background">
                <Coffee className="size-5 text-muted-foreground" />
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">你到了，通行证还没到</h1>
            <CardDescription className="max-w-sm">
              暂无访问权限。
              <br />
              请联系系统管理员，为当前账号配置访问范围。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button asChild>
            <a href={routes.overview.href}>
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              重新检查权限
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">管理员配置好权限后，点击上方按钮重新检查。</p>
        </CardContent>
        <CardFooter className="gap-3">
          <UserRound aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">当前账号</p>
            <p className="break-all text-sm font-medium">{email}</p>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
