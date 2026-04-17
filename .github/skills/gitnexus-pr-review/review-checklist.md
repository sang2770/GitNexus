# GitNexus PR Review Checklist

- Confirm index freshness before deep analysis.
- Check upstream callers of modified symbols.
- Check downstream dependents and transitive impact.
- Verify route/tool/process edges if request path changes.
- Look for contract/schema/API shape changes.
- Verify error handling and rollback behavior.
- Identify tests required for each high-risk path.
- Classify findings by runtime impact, not style.
