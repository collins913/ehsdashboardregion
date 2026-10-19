import { PageContainer } from "@/components/shared/page-container";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dataLogicGroups } from "./logic-content";

export default function DataLogicPage() {
  return (
    <PageContainer className="space-y-6">
      <p className="text-sm text-muted-foreground">当前状态判断规则。展开分类查看；计算仍在服务端。</p>
      <Accordion type="multiple">
        {dataLogicGroups.map((group) => (
          <AccordionItem key={group.id} value={group.id}>
            <AccordionTrigger>{group.title}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {group.types ? <ul className="space-y-1 text-xs text-muted-foreground">{group.types.map((type) => <li key={type}>{type}</li>)}</ul> : null}
                {group.sections.map((section) => (
                  <section key={section.title} className="space-y-2">
                    <h2 className="text-sm font-medium">{section.title}</h2>
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-40">标签</TableHead><TableHead>判断条件</TableHead></TableRow></TableHeader>
                      <TableBody>{section.rows.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="align-top">{row.label}</TableCell>
                          <TableCell className="align-top whitespace-normal">{row.condition}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  </section>
                ))}
                {group.note ? <p className="text-xs leading-relaxed text-muted-foreground">{group.note}</p> : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageContainer>
  );
}
