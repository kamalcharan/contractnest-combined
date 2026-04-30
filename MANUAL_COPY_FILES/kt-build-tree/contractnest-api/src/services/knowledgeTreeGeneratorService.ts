// src/services/knowledgeTreeGeneratorService.ts
import fs from 'fs';
import path from 'path';

interface GenerateKTInput {
  equipmentName: string;
  subCategory: string;
  resourceTemplateId: string;
  serviceActivity?: string;
}

class KnowledgeTreeGeneratorService {
  private readonly anthropicKey: string;
  private readonly model = 'claude-opus-4-7';
  private readonly maxTokens = 16000;

  constructor() {
    this.anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.anthropicKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set — KnowledgeTreeGeneratorService disabled');
    } else {
      console.log('✅ KnowledgeTreeGeneratorService: Initialized');
    }
  }

  private loadSkillPrompt(serviceActivity: string): string {
    const skillPath = path.join(process.cwd(), 'src', 'skills', 'kt-equipment-generator.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    return content.replace(/\{\{SERVICE_ACTIVITY\}\}/g, serviceActivity);
  }

  async generate(input: GenerateKTInput): Promise<any> {
    const { equipmentName, subCategory, resourceTemplateId, serviceActivity = 'pm' } = input;

    if (!this.anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const systemPrompt = this.loadSkillPrompt(serviceActivity);

    const userMessage = `Generate a complete Knowledge Tree for:
Equipment: ${equipmentName}
Sub-category: ${subCategory}
resource_template_id: ${resourceTemplateId}
service_activity: ${serviceActivity}`;

    console.log(`🤖 KT Generate: calling Anthropic for "${equipmentName}" (${serviceActivity})`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    const result = await response.json();
    const rawText: string = result?.content?.[0]?.text;

    if (!rawText) {
      throw new Error('Empty response from Anthropic API');
    }

    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error('LLM returned non-JSON response — check skill file output instructions');
    }
  }
}

export const knowledgeTreeGeneratorService = new KnowledgeTreeGeneratorService();
