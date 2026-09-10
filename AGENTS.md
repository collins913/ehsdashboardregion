# EHS Dashboard Development Rules

1. Reuse before create:
   local component → shadcn/ui → shared component → propose new component.

2. Do not recreate existing Button, Badge, Card, Table, Dialog, Tabs, etc.

3. Do not hard-code repeated visual styles or business status colors in pages.

4. Business rules must not live inside UI components.

5. Pages must not directly read mock JSON; use the repository/data layer.

6. Do not invent EHS metrics, thresholds, status rules, database fields, or permissions.

7. Keep changes scoped; do not refactor unrelated code.

8. Before adding dependencies, components, folders, or variants, check whether an existing solution exists.

9. When working on UI/components, read:
   docs/ui-guidelines.md
   docs/ui-registry.md

10. When working on data/business logic, read:
    docs/data-architecture.md
    docs/metric-rules.md

11. When changing architecture, read:
    docs/decisions.md

12. If a reusable component/variant is missing, report the gap instead of creating a local workaround.

13. Before starting work, inspect the current Git branch and repository status.

14. Do not modify AGENTS.md, architecture rules, or shared design rules unless explicitly requested.

15. After completing a scoped task, update relevant project documentation if the implementation changes current project behavior or structure.

16. Do not merge, delete branches, or rewrite Git history unless explicitly requested.
