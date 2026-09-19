# Overview Demo V2

This folder is an experimental and disposable Overview prototype.

- The current scoring model is a Demo assumption, not a formal business rule.
- Demo fixtures are not a Production contract.
- No formal feature may import from `overview-demo`.
- A successful Demo must be migrated deliberately into formal architecture; do not simply rename this folder.
- All Demo-only code in this folder and `src/data/mock/overview-demo` may be deleted together.
- Region, Area and Store identity reuse the existing canonical Global Filter hierarchy.
- Demo story templates are deterministically materialized onto the active canonical Store Master profile, including the 500-store performance profile.
- Period mapping is prototype-only. The current Demo snapshot is fixed to Q2 2026 versus Q1 2026 and does not consume the Global Period selection.
- Demo history contains four deterministic snapshots: Q3 2025, Q4 2025, Q1 2026 and Q2 2026.
- Attribution compares the same store and scored item across Q1 and Q2: PASS→FAIL is New Issue, FAIL→FAIL is Persistent, FAIL→PASS is Recovered, PASS→PASS is Stable Good, and any transition containing MISSING is handled separately.
- Driver labels use affected store and area counts only. They do not claim a numeric contribution to the score.
- Attention Matrix quadrants are relative visual groupings using the displayed peer average and zero change; they are not business statuses or thresholds.
- Issue concentration uses Top Area, Top 2 Areas and Top 3 Areas share. No concentration threshold is defined.
- Persistence Rate is `persistent current issues / current affected issues`; a zero denominator returns no rate. It is not a score or threshold.
- Priority Investigation is deterministic and experimental: persistent decline drivers, new decline drivers, persistent issues, new issues, then other current failures; ties use affected Store count and stable issue key. It is not a risk score.
- Management Signals, labeled priority scopes, lifecycle views, compact dimensions and change lanes are visual interpretation of existing Demo analytics only.
- Recharts is used locally for the Attention Matrix, four-period trends, lifecycle, benchmark, dimension and issue-distribution charts. No shared chart system was added.
- Demo fixture access is isolated behind `src/features/overview-demo/data/overview-demo-fixture-repository.ts`; formal Repository contracts are unchanged.
- Environment remains visible but is excluded from scoring until a formal scoring model exists.
