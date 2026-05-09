// src/services/knowledgeTreeGeneratorService.ts
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { jsonrepair } from 'jsonrepair';

interface GenerateKTInput {
  equipmentName: string;
  subCategory: string;
  resourceTemplateId: string;
  serviceActivity?: string;
  existingKT?: boolean;
}

interface GenerateStepInput {
  equipmentName: string;
  subCategory: string;
  resourceTemplateId: string;
  serviceActivity?: string;
  variants?: Array<{ id: string; name: string; capacity_range?: string | null }>;
}

class KnowledgeTreeGeneratorService {
  private readonly anthropicKey: string;
  private readonly anthropicUrl: string;
  private readonly model: string;

  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    this.anthropicUrl = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
    this.model = process.env.KT_LLM_MODEL || 'claude-sonnet-4-6';
    if (!this.anthropicKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set — KnowledgeTreeGeneratorService disabled');
    } else {
      console.log(`✅ KnowledgeTreeGeneratorService: model=${this.model}, url=${this.anthropicUrl}`);
    }
  }

  private loadSkill(fileName: string, replacements?: Record<string, string>): string {
    const skillPath = path.join(process.cwd(), 'src', 'skills', fileName);
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill file not found at: ${skillPath}`);
    }
    let content = fs.readFileSync(skillPath, 'utf-8');
    if (replacements) {
      for (const [token, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(token, 'g'), value);
      }
    }
    return content;
  }

  private async callAnthropic(systemPrompt: string, userMessage: string, maxTokens: number, label: string): Promise<any> {
    console.log(`🤖 KT [${label}]: maxTokens=${maxTokens}`);

    let response;
    try {
      response = await axios.post(
        this.anthropicUrl,
        {
          model: this.model,
          max_tokens: maxTokens,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: userMessage }],
        },
        {
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'prompt-caching-2024-07-31',
            'content-type': 'application/json',
          },
          timeout: 300000,
        }
      );
    } catch (axiosErr: any) {
      const status = axiosErr.response?.status;
      const body = axiosErr.response?.data;
      console.error(`❌ Anthropic API error (${status}):`, JSON.stringify(body));
      throw new Error(body?.error?.message || axiosErr.message);
    }

    const stopReason: string = response.data?.stop_reason;
    const rawText: string = response.data?.content?.[0]?.text;
    const usage = response.data?.usage;

    if (usage) {
      console.log(`📊 [${label}] Tokens — in: ${usage.input_tokens} (cached: ${usage.cache_read_input_tokens ?? 0}), out: ${usage.output_tokens}, stop: ${stopReason}`);
    }
    if (stopReason === 'max_tokens') {
      console.warn(`⚠️ [${label}] hit max_tokens (${maxTokens}) — output may be truncated`);
    }
    if (!rawText) {
      throw new Error('Empty response from Anthropic API');
    }

    // Debug: log raw response boundaries
    console.log(`🔍 [${label}] Raw length: ${rawText.length} chars`);
    console.log(`🔍 [${label}] Start: ${rawText.substring(0, 150)}`);
    console.log(`🔍 [${label}] End: ${rawText.substring(Math.max(0, rawText.length - 150))}`);

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(`[${label}] No JSON object found in LLM response`);
    }

    const jsonText = rawText.substring(firstBrace, lastBrace + 1);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.warn(`⚠️ [${label}] JSON has syntax errors — attempting repair...`);
      try {
        parsed = JSON.parse(jsonrepair(jsonText));
        console.log(`✅ [${label}] JSON repaired successfully`);
      } catch (repairErr: any) {
        console.error(`❌ [${label}] JSON repair failed:`, repairErr.message);
        throw new Error(`[${label}] produced invalid JSON: ${repairErr.message}`);
      }
    }

    // Debug: log structure
    const topKeys = Object.keys(parsed);
    const arraySizes = topKeys
      .filter(k => Array.isArray(parsed[k]))
      .map(k => `${k}:${parsed[k].length}`)
      .join(', ');
    console.log(`🔍 [${label}] Keys: [${topKeys.join(', ')}] | Arrays: ${arraySizes || 'none'}`);

    return parsed;
  }

  // ── Full single-prompt generation (legacy — kept for + Install / + Decomm activity mode) ──
  private loadSkillPrompt(serviceActivity: string, existingKT: boolean): string {
    const fileName = existingKT ? 'kt-activity-generator.md' : 'kt-equipment-generator.md';
    return this.loadSkill(fileName, { '\\{\\{SERVICE_ACTIVITY\\}\\}': serviceActivity });
  }

  async generate(input: GenerateKTInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId, serviceActivity = 'pm', existingKT = false } = input;
    if (!this.anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured in .env');

    const systemPrompt = this.loadSkillPrompt(serviceActivity, existingKT);
    const userMessage = `Generate a ${existingKT ? '' : 'complete '}Knowledge Tree for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}
service_activity: ${serviceActivity}`;

    const maxTokens = existingKT ? 12000 : 16000;
    return this.callAnthropic(systemPrompt, userMessage, maxTokens, existingKT ? `activity-${serviceActivity}` : 'full');
  }

  // ── Step 1: Variants only ────────────────────────────────────────────────────
  async generateVariants(input: GenerateStepInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId } = input;
    if (!this.anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured in .env');

    const systemPrompt = this.loadSkill('kt-variants-generator.md');
    const userMessage = `Generate variants for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}`;

    return this.callAnthropic(systemPrompt, userMessage, 2000, 'step1-variants');
  }

  // ── Step 2: Spare parts + variant map ───────────────────────────────────────
  async generateSpareParts(input: GenerateStepInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId, variants = [] } = input;
    if (!this.anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured in .env');

    const systemPrompt = this.loadSkill('kt-spare-parts-generator.md');
    const variantsContext = variants.map(v => `  - id: "${v.id}"  name: "${v.name}"${v.capacity_range ? `  range: "${v.capacity_range}"` : ''}`).join('\n');
    const userMessage = `Generate spare parts for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}

Existing variants (use these EXACT UUIDs in spare_part_variant_map):
${variantsContext}`;

    return this.callAnthropic(systemPrompt, userMessage, 6000, 'step2-spare-parts');
  }

  // ── Step 3: Checkpoints + values + variant map + service cycles ─────────────
  async generateCheckpoints(input: GenerateStepInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId, serviceActivity = 'pm', variants = [] } = input;
    if (!this.anthropicKey) throw new Error('ANTHROPIC_API_KEY is not configured in .env');

    const systemPrompt = this.loadSkill('kt-checkpoints-generator.md', {
      '\\{\\{SERVICE_ACTIVITY\\}\\}': serviceActivity,
    });
    const variantsContext = variants.map(v => `  - id: "${v.id}"  name: "${v.name}"${v.capacity_range ? `  range: "${v.capacity_range}"` : ''}`).join('\n');
    const userMessage = `Generate checkpoints and service cycles for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}
service_activity: ${serviceActivity}

Existing variants (use these EXACT UUIDs in checkpoint_variant_map):
${variantsContext}`;

    return this.callAnthropic(systemPrompt, userMessage, 10000, `step3-checkpoints-${serviceActivity}`);
  }
}

export const knowledgeTreeGeneratorService = new KnowledgeTreeGeneratorService();
