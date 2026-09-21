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
- Scope Detail history contains four deterministic snapshots: Q3 2025, Q4 2025, Q1 2026 and Q2 2026. The Hero uses a separate 12-month deterministic fixture ending in June 2026.
- Attribution compares the same store and scored item across Q1 and Q2: PASS→FAIL is New Issue, FAIL→FAIL is Persistent, FAIL→PASS is Recovered, PASS→PASS is Stable Good, and any transition containing MISSING is handled separately.
- Driver labels use affected store and area counts only. They do not claim a numeric contribution to the score.
- Scope ranking uses standard competition ranking: equal scores share a rank and the next rank skips accordingly; stable scope IDs determine display order within ties.
- Main change explains period movement from decline or recovery attribution. Current concern is a separate current-state signal and may identify a different issue.
- Attention Matrix quadrants are relative visual groupings using the displayed peer average and zero change; they are not business statuses or thresholds.
- Issue concentration uses Top Area, Top 2 Areas and Top 3 Areas share. No concentration threshold is defined.
- Persistence Rate is `persistent current issues / current affected issues`; a zero denominator returns no rate. It is not a score or threshold.
- Lifecycle uses one shared legend: New is red, Persistent is amber, and Recovered is green. `Current = New + Persistent`; `Previous = Persistent + Recovered`.
- Priority Investigation is deterministic and experimental: persistent decline drivers, new decline drivers, persistent issues, new issues, then other current failures; ties use affected Store count and stable issue key. It is not a risk score.
- Management Signals, labeled priority scopes, lifecycle views, compact dimensions and change lanes are visual interpretation of existing Demo analytics only.
- Scope Detail consumes structured diagnostic metadata, deterministic trend labels, child-scope changes and route targets; it does not depend on fixture-authored narrative text.
- Child-scope change lists reuse existing score and delta results, show at most five declines and five improvements, and use stable scope IDs to break ties.
- Recharts is used locally for the Attention Matrix, monthly Hero and four-period Detail trends, lifecycle, benchmark, dimension and issue-distribution charts. No shared chart system was added.
- Demo fixture access is isolated behind `src/features/overview-demo/data/overview-demo-fixture-repository.ts`; formal Repository contracts are unchanged.
- Environment remains visible but is excluded from scoring until a formal scoring model exists.
