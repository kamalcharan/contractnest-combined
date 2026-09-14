const assert=require('node:assert/strict');
const path=require('node:path');
const Module=require('node:module');
const root=require('node:fs').existsSync(path.resolve('contractnest-ui'))?process.cwd():path.resolve('contractnest-combined');
const ui=root+'/contractnest-ui';
const {buildSync}=require(ui+'/node_modules/esbuild');
const result=buildSync({stdin:{contents:`export * from './src/components/contracts/ContractWizard/experience/moneyModel'; export * from './src/utils/service-contracts/contractEvents'; export {computeEventsForApi} from './src/components/contracts/ContractWizard/logic/mapper'; export {deriveContractEvents,deriveComputedEvents} from '../contractnest-api/src/services/contractEventsDerivationService';`,resolveDir:ui,loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',alias:{'@':ui+'/src'}});
const m=new Module('money-qa');m._compile(result.outputFiles[0].text,'money-qa.cjs');const q=m.exports;
const base={startDate:new Date(2026,8,15),durationValue:12,durationUnit:'months',selectedBlocks:[],paymentMode:'defined',emiMonths:6,perBlockPaymentType:{},billingCycleType:'mixed',currency:'INR',discountType:null,discountValue:0,eventOverrides:{}};
const block=(extra={})=>({id:'full-unique-block-id',name:'Agreed service',categoryId:'service',quantity:12,price:100,listPrice:100,cycle:'monthly',serviceCycleDays:30,unlimited:false,totalPrice:1416,currency:'INR',taxRate:18,taxInclusion:'exclusive',taxes:[{id:'gst',name:'GST',rate:18}],config:{},...extra});
let cases=0;
function check(state){const s={...base,...state};s.perBlockPaymentType=Object.fromEntries(s.selectedBlocks.map(b=>[b.id,'prepaid']));if(state.perBlockPaymentType)s.perBlockPaymentType=state.perBlockPaymentType;Object.assign(s,q.moneyTotals(s));const ui=q.computeContractEvents(s),api=q.deriveContractEvents(s);assert.deepEqual(JSON.parse(JSON.stringify(ui)),JSON.parse(JSON.stringify(api)),'Actual UI/API parity');const preview=q.moneyPreview(s);assert.deepEqual(preview.errors,[]);assert.equal(q.cents(ui.filter(e=>e.event_type==='billing').reduce((n,e)=>n+e.amount,0)),s.grandTotal);assert.deepEqual(q.computeEventsForApi(s),q.deriveComputedEvents(s));cases++;return {s,events:ui};}
check({selectedBlocks:[block()]});
check({selectedBlocks:[block(),block({id:'fee',categoryId:'billing',name:'Setup fee',quantity:1,price:200,totalPrice:236,cycle:'prepaid'})]});
for(const cycle of ['prepaid','postpaid','monthly','quarterly']){const {events}=check({selectedBlocks:[block({unlimited:true,quantity:999,cycle,totalPrice:118})]});assert.equal(events.filter(e=>e.event_type==='service').length,0);assert.equal(events.filter(e=>e.event_type==='billing').length,['prepaid','postpaid'].includes(cycle)?1:cycle==='monthly'?12:4);}
check({selectedBlocks:[block()],discountType:'percent',discountValue:10});
check({selectedBlocks:[block({price:118,totalPrice:1416,taxInclusion:'inclusive'})],discountType:'percent',discountValue:10});
check({selectedBlocks:[block()],discountType:'amount',discountValue:125});
check({selectedBlocks:[block({cycle:'prepaid'})],billingCycleType:'unified',paymentMode:'prepaid',discountType:'percent',discountValue:100});
check({selectedBlocks:[block()],paymentMode:'emi',emiMonths:7});
const end=check({selectedBlocks:[block()],perBlockPaymentType:{'full-unique-block-id':'postpaid'}});assert.equal(end.events.find(e=>e.event_type==='billing').scheduled_date.getTime(),new Date(2026,9,15).getTime());
const cp={baseAmount:1200,baseMonths:12,rates:[{cycle:'quarterly',amount:300,enabled:true},{cycle:'monthly',amount:110,enabled:true}]};
const cad=block({cycle:'quarterly',price:300,quantity:12,totalPrice:1416,config:{cadencePricing:cp}});
check({selectedBlocks:[cad]});
check({durationValue:10,selectedBlocks:[block({...cad,totalPrice:1180,config:{...cad.config,cadenceFinalPayment:100}})]});
const changed=q.changeCycle(cad,'monthly',base);assert.equal(changed.price,110);assert.equal(changed.totalPrice,1557.6);
for(const bad of [{discountType:'percent',discountValue:101},{discountType:'amount',discountValue:-1},{currency:'USD'},{emiMonths:100,paymentMode:'emi'},{billingCycleType:null},{selectedBlocks:[block({totalPrice:99})]}]){assert.ok(q.moneyPreview({...base,selectedBlocks:[block()],...bad}).errors.length);cases++;}
const clipped=q.moneyPreview({...base,selectedBlocks:[block({quantity:100,totalPrice:11800})],perBlockPaymentType:{'full-unique-block-id':'prepaid'}});assert.ok(clipped.errors.some(e=>e.includes('does not add up')));
console.log(`PASS ${cases} financial cases + invalid/clipped schedule protection; actual UI/API event and payload parity.`);
for(let i=1;i<=60;i++){
 const items=[1,2,3].map(j=>{const price=q.cents(10+i*j/7);return block({id:`rounding-${j}`,price,quantity:1,totalPrice:q.cents(price*1.18),cycle:'prepaid'});});
 check({selectedBlocks:items,discountType:'percent',discountValue:13.25});
}
console.log('PASS 60 multi-line discount and cent-rounding cases.');
check({selectedBlocks:[block({price:0,totalPrice:0,config:{complimentary:true}})]});
const noVisit=check({selectedBlocks:[block({id:'fee-only',categoryId:'billing'}),block({id:'group',categoryId:'session',price:0,totalPrice:0,taxRate:0,taxes:[]})]});assert.equal(noVisit.events.filter(e=>e.event_type==='service').length,0);
check({selectedBlocks:[block({isFlyBy:true,flyByType:'service'})]});
check({selectedBlocks:[block({cycle:'custom',customCycleDays:30})]});
check({selectedBlocks:[block()],durationUnit:'years',durationValue:1});
check({selectedBlocks:[block()],durationUnit:'days',durationValue:360});
assert.ok(q.moneyPreview({...base,selectedBlocks:[block({taxInclusion:undefined})]}).errors.some(e=>e.includes('tax inclusion')));
assert.ok(q.moneyPreview({...base,selectedBlocks:[block()],perBlockPaymentType:{'full-unique-block-id':'prepaid'},eventOverrides:{'evt_billing_full-unique-block-id_1':new Date(2020,0,1)}}).errors.some(e=>e.includes('outside')));
console.log('PASS complimentary, fee/group isolation, FlyBy, custom cycles, years/days, tax and date-override guards.');
