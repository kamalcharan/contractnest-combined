import type {ConfigurableBlock} from '@/components/catalog-studio';

export function missingServiceSchedule(block:ConfigurableBlock):boolean {
  return block.categoryId==='service' && !block.unlimited && !block.config?.billingOnly && Number.isInteger(block.quantity) && block.quantity>1 && !(Number.isFinite(block.serviceCycleDays)&&block.serviceCycleDays!>0);
}

export function serviceScheduleErrors(blocks:ConfigurableBlock[]):string[] {
  return blocks.filter(missingServiceSchedule).map(b=>`${b.name?.trim()||'Unnamed service'}: ${b.quantity} visits need a delivery interval. Open this commitment and set “Every ___ days”.`);
}
