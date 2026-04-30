// src/services/knowledgeTreeGeneratorService.ts
import fs from 'fs';
import path from 'path';
import axios from 'axios';

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
  private readonly maxTokens = 32000;

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

    const response = await axios.post(
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
        timeout: 180000, // 3 minutes
      }
    );

    const rawText: string = response.data?.content?.[0]?.text;

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
    } catch (parseErr: any) {
      console.error('❌ KT JSON parse error:', parseErr.message);
      console.error('❌ KT extracted JSON (first 500 chars):', jsonText.substring(0, 500));
      throw new Error(`LLM JSON parse failed: ${parseErr.message}`);
    }
  }
}

export const knowledgeTreeGeneratorService = new KnowledgeTreeGeneratorService();
