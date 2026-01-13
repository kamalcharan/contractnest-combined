# Edge Layer Patterns

## 🎯 Edge Purpose
Edge exists to: **Protect → Route → Emit Events**
Edge does NOT: Do work, loop, process, enrich

Target execution: **< 20-30ms CPU**

---

## ✅ CORRECT: Single RPC Call (Copy This)
```typescript
// Edge handler - contacts list
export async function getContacts(
  req: Request, 
  tenantId: string
): Promise<Response> {
  const { limit = 50, offset = 0 } = req.query;
  
  // ONE call - database does all work
  const { data, error } = await supabase.rpc('get_contacts_list', {
    p_tenant_id: tenantId,
    p_limit: Number(limit),
    p_offset: Number(offset)
  });
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}
```

---

## ✅ CORRECT: Async Write with Event (Copy This)
```typescript
// Edge handler - create contract
export async function createContract(
  req: Request, 
  tenantId: string
): Promise<Response> {
  const body = await req.json();
  
  // 1. Write to DB
  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({ ...body, tenant_id: tenantId })
    .select('id')
    .single();
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  // 2. Emit event (fire-and-forget) - AI processes async
  await supabase.rpc('pgmq_send', {
    queue_name: 'contract_processing',
    message: JSON.stringify({ 
      contract_id: contract.id, 
      action: 'analyze' 
    })
  });
  
  // 3. Return immediately - DON'T wait for AI
  return Response.json({ success: true, id: contract.id });
}
```

---

## ❌ WRONG: Loop in Edge (NEVER DO THIS)
```typescript
// FORBIDDEN - Will be rejected
export async function getContacts(req: Request, tenantId: string) {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId);
  
  // ❌ N+1 QUERY - DESTROYS PERFORMANCE
  for (const contact of contacts) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', contact.company_id)
      .single();
    contact.company_name = company?.name;
  }
  
  return Response.json({ data: contacts });
}
```

---

## ❌ WRONG: AI on Sync Path (NEVER DO THIS)
```typescript
// FORBIDDEN - Will timeout, terrible UX
export async function createContract(req: Request, tenantId: string) {
  const body = await req.json();
  
  const { data: contract } = await supabase
    .from('contracts')
    .insert(body)
    .select()
    .single();
  
  // ❌ BLOCKING AI CALL - 30+ SECONDS
  const analysis = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: `Analyze: ${contract.content}` }]
  });
  
  // ❌ User waits 30+ seconds - WILL FAIL AT SCALE
  return Response.json({ contract, analysis: analysis.content });
}
```

---

## ❌ WRONG: Business Logic in Edge (NEVER DO THIS)
```typescript
// FORBIDDEN - Logic belongs in DB
export async function getContactStats(req: Request, tenantId: string) {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('tenant_id', tenantId);
  
  // ❌ AGGREGATION IN JS - SHOULD BE IN POSTGRES
  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.status === 'active').length,
    avgValue: contacts.reduce((a, c) => a + c.value, 0) / contacts.length
  };
  
  return Response.json({ stats });
}
```

---

## ✅ Edge Checklist
Before submitting Edge code:
- [ ] Single DB call (RPC preferred)
- [ ] No loops with await inside
- [ ] No AI calls (use PGMQ)
- [ ] No data transformation (DB does this)
- [ ] Error handling with proper status codes
- [ ] < 30ms expected execution
