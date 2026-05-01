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
}

class KnowledgeTreeGeneratorService {
  private readonly anthropicKey: string;
  // Allow override via env var; sonnet-4-6 is the default — excellent structured JSON output
  private readonly model: string;
  private readonly maxTokens = 16000;

  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.KT_LLM_MODEL || 'claude-sonnet-4-6';
    if (!this.anthropicKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set — KnowledgeTreeGeneratorService disabled');
    } else {
      console.log(`✅ KnowledgeTreeGeneratorService: Initialized (model: ${this.model})`);
    }
  }

  private loadSkillPrompt(serviceActivity: string): string {
    const skillPath = path.join(process.cwd(), 'src', 'skills', 'kt-equipment-generator.md');
    if (!fs.existsSync(skillPath)) {
      throw new Error(`Skill file not found at: ${skillPath}`);
    }
    const content = fs.readFileSync(skillPath, 'utf-8');
    return content.replace(/\{\{SERVICE_ACTIVITY\}\}/g, serviceActivity);
  }

  async generate(input: GenerateKTInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId, serviceActivity = 'pm' } = input;

    if (!this.anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured in .env');
    }

    const systemPrompt = this.loadSkillPrompt(serviceActivity);

    const userMessage = `Generate a complete Knowledge Tree for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}
service_activity: ${serviceActivity}`;

    console.log(`🤖 KT Generate: calling Anthropic for "${equipmentName}" (model: ${this.model})`);

    let response;
    try {
      response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        },
        {
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 300000, // 5 minutes
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

    if (stopReason === 'max_tokens') {
      console.warn(`⚠️ KT response hit max_tokens (${this.maxTokens}) — output may be truncated`);
    }

    if (!rawText) {
      throw new Error('Empty response from Anthropic API');
    }

    // Extract the outermost JSON object — handles code fences, trailing notes, and any extra text
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      console.error('❌ KT raw response (first 500 chars):', rawText.substring(0, 500));
      throw new Error('No JSON object found in LLM response');
    }

    const jsonText = rawText.substring(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(jsonText);
    } catch {
      // LLM occasionally produces minor syntax errors (missing commas, etc.) — repair and retry
      console.warn('⚠️ KT JSON has syntax errors — attempting repair...');
      try {
        const repaired = jsonrepair(jsonText);
        const result = JSON.parse(repaired);
        console.log('✅ KT JSON repaired successfully');
        return result;
      } catch (repairErr: any) {
        console.error('❌ KT JSON repair failed:', repairErr.message);
        throw new Error(`KT generation produced invalid JSON: ${repairErr.message}`);
      }
    }
  }
}

export const knowledgeTreeGeneratorService = new KnowledgeTreeGeneratorService();
