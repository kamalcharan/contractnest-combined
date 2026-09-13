# After this release

1. Validate navigation and login locally, then merge Sprint 1.5 after acceptance.
2. Next release: **Needs your attention** on Home. Prioritise overdue contract events, today's service/payment events, and agreements awaiting action. Every item must link to its existing contract/event screen, with accurate tenant + environment + perspective scope and explicit loading/empty/error states. Reuse existing sources, not sampled totals or a duplicate finance engine.
3. Following release: **Execute and return**. Test the handoff to appointments, group sessions, service execution, and Money In/Out, then refresh Home after changes. Preserve each event's contract relationship and the contract's own payment cycle.
4. Then: **WhatsApp readiness**. Map approved event actions to existing WhatsApp/Flows capabilities, tenant opt-ins, templates, credits, and status feedback. No generic chatbot or autonomous sending introduced as part of navigation.

Review each release separately with MANUAL_COPY_FILES. Keep `/ops/cockpit` available until operational coverage and reliability in Home are validated. CRO should be judged by observed first-action/completion rates and time-to-value, not visual polish alone.
