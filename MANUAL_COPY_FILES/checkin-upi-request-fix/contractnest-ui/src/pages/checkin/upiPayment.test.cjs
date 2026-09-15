// Run from contractnest-ui: node src/pages/checkin/upiPayment.test.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const esbuild=require('esbuild');
const code=esbuild.transformSync(fs.readFileSync(__dirname+'/upiPayment.ts','utf8'),{loader:'ts',format:'cjs'}).code;
const testModule={exports:{}};
new Function('module','exports',code)(testModule,testModule.exports);
const {buildUpiPaymentIntent,copyUpiId}=testModule.exports;
const input={upiId:' merchant@bank ',payeeName:'Company & Partners',amount:123.5,currency:'INR',reference:'CN12345'};
const uri=buildUpiPaymentIntent(input),url=new URL(uri);
assert.equal(url.protocol,'upi:');assert.equal(url.hostname,'pay');
assert.equal(url.searchParams.get('pa'),'merchant@bank');
assert.equal(url.searchParams.get('pn'),'Company & Partners');
assert.equal(url.searchParams.get('am'),'123.50');
assert.equal(url.searchParams.get('cu'),'INR');
assert.equal(url.searchParams.get('tr'),'CN12345');
assert.equal(url.searchParams.has('mc'),false);
assert.equal(url.searchParams.has('sign'),false);
assert(uri.includes('%26'));assert(uri.includes('%20'));
for(const overrides of [{upiId:'x@bank&pa=other@bank'},{payeeName:''},{amount:0},{amount:-1},{amount:NaN},{amount:Infinity},{currency:'USD'},{currency:''},{reference:''},{reference:'bad&ref'}])assert.throws(()=>buildUpiPaymentIntent({...input,...overrides}));
(async()=>{
 let copied='';assert.equal(await copyUpiId(' merchant@bank ',{writeText:async text=>{copied=text;}}),true);assert.equal(copied,'merchant@bank');
 assert.equal(await copyUpiId('merchant@bank',undefined),false);
 assert.equal(await copyUpiId('merchant@bank',{writeText:async()=>{throw Error('denied');}}),false);
 console.log('PASS: UPI parameters, escaping, invalid inputs and clipboard success/failure. No payment initiated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
