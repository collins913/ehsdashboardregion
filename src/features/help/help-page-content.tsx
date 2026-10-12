"use client";

import { useState } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { helpSections, searchHelpSections } from "./help-content";

export function HelpPageContent() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(["basics"]);
  const sections = searchHelpSections(query);
  const searching = query.trim().length > 0;
  function updateQuery(value: string) {
    setQuery(value);
    setExpanded(value.trim() ? searchHelpSections(value).map((section) => section.id) : ["basics"]);
  }

  return (
    <PageContainer className="space-y-6">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">查计算方法、字段含义和状态解释。这里说明当前 V1 已实现的口径；待确认的公司数据定义会明确标注，不作为正式规则。</p>
        <label className="grid gap-2 text-sm font-medium">
          搜索帮助
          <Input type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="例如：关闭率、到期日期、TRTID" />
        </label>
        <p className="text-xs text-muted-foreground" role="status">{searching ? `找到 ${sections.length} 个相关模块` : `${helpSections.length} 个模块 · 可按目录查阅或搜索关键词`}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="帮助目录" className="flex flex-wrap gap-2 lg:sticky lg:top-6 lg:flex-col lg:gap-1">
          {sections.map((section) => <Button key={section.id} asChild variant="ghost" className="justify-start whitespace-normal text-left">
            <a href={`#help-${section.id}`} onClick={() => setExpanded((current) => current.includes(section.id) ? current : [...current, section.id])}>{section.title.split("：")[0]}</a>
          </Button>)}
        </nav>
        <div className="min-w-0">
          <h2 className="sr-only">模块说明</h2>
          {sections.length ? <Accordion type="multiple" value={expanded} onValueChange={setExpanded}>
            {sections.map((section) => <AccordionItem key={section.id} value={section.id} id={`help-${section.id}`} className="scroll-mt-6">
              <AccordionTrigger>{section.title}</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{section.summary}</p>
                <div className="space-y-5 py-2">
                  {section.rules.map((rule) => <section key={rule.title} className="space-y-2">
                    <h4 className="font-medium">{rule.title}</h4>
                    <p className="max-w-4xl leading-relaxed text-muted-foreground">{rule.text}</p>
                  </section>)}
                  <section className="space-y-3">
                    <h4 className="font-medium">字段解释</h4>
                    <dl className="divide-y">
                      {section.fields.map(([name, explanation]) => <div key={name} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                        <dt className="break-words font-medium">{name}</dt>
                        <dd className="break-words leading-relaxed text-muted-foreground">{explanation}</dd>
                      </div>)}
                    </dl>
                  </section>
                </div>
              </AccordionContent>
            </AccordionItem>)}
          </Accordion> : <div className="space-y-3 py-8">
            <p className="text-sm text-muted-foreground">没有匹配的说明，试试其他字段名或更短的关键词。</p>
            <Button variant="outline" onClick={() => updateQuery("")}>清空搜索</Button>
          </div>}
        </div>
      </div>
    </PageContainer>
  );
}
