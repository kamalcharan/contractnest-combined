# B4.1 — MSG91 WhatsApp template registration (owner copy-paste)

**Register these five in the MSG91 panel** (WhatsApp → Templates → Create).
Everything else of B4 is already live and harness-proven; sending starts
working the moment Meta approves each template.

**Settings identical for all five:**
- Template **name**: EXACTLY as given (must match the platform's template_key)
- Category: **Utility** · Language: **English (en)** · Parameters: **POSITIONAL** ({{1}}, {{2}}…)
- ⚠️ Do NOT use named parameters — the account's post-Aug-2026 registrations are positional, and a style mismatch fails silently on delivery.

---

### 1. `service_visit_scheduled`
```
Hi {{1}}, your service visit for {{2}} has been scheduled on {{3}}. Our team will see you then. - {{4}}
```
{{1}} customer name · {{2}} service name · {{3}} visit date · {{4}} business name
Samples: Charan Kamal · Air Handling Unit Servicing · 17 Sep 2026 · signia

### 2. `service_visit_started`
```
Hi {{1}}, {{2}} has started the service visit for {{3}}. We will update you when it is complete. - {{4}}
```
{{1}} customer name · {{2}} technician name · {{3}} service name · {{4}} business name
Samples: Charan Kamal · Ramesh Kumar · Air Handling Unit Servicing · signia

### 3. `service_visit_completed`
```
Hi {{1}}, your service visit ({{2}}) is complete - {{3}} asset(s) serviced and verified. Thank you for choosing {{4}}.
```
{{1}} customer name · {{2}} ticket number · {{3}} asset count · {{4}} business name
Samples: Charan Kamal · TKT-10002 · 3 · signia

### 4. `service_report_ready`
```
Hi {{1}}, the service report for {{2}} is ready. View and save it here: {{3}} - {{4}}
```
{{1}} customer name · {{2}} ticket number · {{3}} report link · {{4}} business name
Samples: Charan Kamal · TKT-10002 · https://contractnest.com/report/service/abc123 · signia
(If the app's public domain is not contractnest.com, edit `app_base_url`
on the "Service report ready" rule at /settings/configure/automation-rules.)

### 5. `beyond_scope_invoice`
```
Hi {{1}}, during your service visit some additional work was required. Invoice {{2}} for {{3}} has been raised, due {{4}}. - {{5}}
```
{{1}} customer name · {{2}} invoice number · {{3}} amount · {{4}} due date · {{5}} business name
Samples: Charan Kamal · INV-10052 · Rs 2,180 · 27 Sep 2026 · signia

---

**Until registered**: a real ticket action will enqueue rows that MSG91
rejects (they show as failed in /admin/jtd) — harmless, but register soon,
or temporarily switch the five rules off per tenant on the automation page.
**After approval**: no further action — the worker picks the template by
name automatically; check the first real send on a handset (the
`status='sent'` ≠ delivered lesson).
