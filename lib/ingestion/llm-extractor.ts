/**
 * TenderHub MN: Multi-LLM Structured Extraction Engine
 * Supports 1M+ token context (Google Gemini 1.5 Flash) and OpenAI GPT-4o-mini.
 * Configurable via process.env.LLM_MODEL.
 */

export interface TenderStructuredData {
  tender_id: string;
  project_title: string;
  project_title_mn?: string;
  buyer_name: string;
  sector: string;
  budget_category: string;
  estimated_budget_mnt: number;
  publish_date: string;
  deadline: string;
  deadline_year?: number;
  eligibility_requirements: string[];
  key_requirements?: string[];
  full_scope_of_work: string;
  historical_comparison_flags: string;
  historical_comparison_notes?: string;
}

const TENDER_JSON_SCHEMA = {
  name: 'tender_full_extraction_schema',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tender_id: {
        type: 'string',
        description: 'The tender ID / invitation code (e.g. МТЗ/20240102114)',
      },
      project_title: {
        type: 'string',
        description: 'The full project/tender title in Mongolian',
      },
      buyer_name: {
        type: 'string',
        description: 'The top procuring entity / buyer (захиалагч байгууллага)',
      },
      sector: {
        type: 'string',
        description: 'Categorize the sector (e.g., Барилга, Мэдээллийн технологи, Эрүүл мэнд, Боловсрол, Уул уурхай, Тээвэр, Бусад)',
      },
      budget_category: {
        type: 'string',
        description: 'Budget tier: under50m, from50to500m, from500mto2b, above2b',
      },
      estimated_budget_mnt: {
        type: 'number',
        description: 'The exact numerical budget in Mongolian Tugriks (MNT)',
      },
      publish_date: {
        type: 'string',
        description: 'Announcement/publish date in YYYY-MM-DD format',
      },
      deadline: {
        type: 'string',
        description: 'Bid submission closing deadline in YYYY-MM-DD format',
      },
      eligibility_requirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Full list of qualification, licensing, financial, and technical eligibility requirements',
      },
      full_scope_of_work: {
        type: 'string',
        description: 'Full, detailed scope of work, technical specifications, Bill of Quantities, and deliverables - do not summarize',
      },
      historical_comparison_flags: {
        type: 'string',
        description: 'Historical comparison flags, recurring patterns, or previous procurement notes',
      },
    },
    required: [
      'tender_id',
      'project_title',
      'buyer_name',
      'sector',
      'budget_category',
      'estimated_budget_mnt',
      'publish_date',
      'deadline',
      'eligibility_requirements',
      'full_scope_of_work',
      'historical_comparison_flags',
    ],
    additionalProperties: false,
  },
};

const SYSTEM_INSTRUCTION = `You are an expert Mongolian procurement analyst and search engine indexer. 
I will provide the full text extracted from a Mongolian government tender document (which may be 20 to 100+ pages long).
Analyze the text thoroughly and return the result STRICTLY as a valid JSON object matching the required schema.
IMPORTANT: For 'full_scope_of_work', retain the full, detailed technical specifications, quantities, items, and requirements so they can be indexed for deep keyword search. Do NOT over-summarize.`;

function normalizeStructuredData(raw: any): TenderStructuredData {
  return {
    tender_id: String(raw.tender_id || ''),
    project_title: String(raw.project_title || raw.project_title_mn || ''),
    project_title_mn: String(raw.project_title || raw.project_title_mn || ''),
    buyer_name: String(raw.buyer_name || ''),
    sector: String(raw.sector || 'Бусад'),
    budget_category: String(raw.budget_category || 'under50m'),
    estimated_budget_mnt: Number(raw.estimated_budget_mnt) || 0,
    publish_date: String(raw.publish_date || new Date().toISOString().split('T')[0]),
    deadline: String(raw.deadline || raw.publish_date || ''),
    deadline_year: raw.deadline_year || (raw.deadline ? new Date(raw.deadline).getFullYear() : 2024),
    eligibility_requirements: Array.isArray(raw.eligibility_requirements)
      ? raw.eligibility_requirements
      : Array.isArray(raw.key_requirements)
      ? raw.key_requirements
      : [],
    key_requirements: Array.isArray(raw.eligibility_requirements)
      ? raw.eligibility_requirements
      : Array.isArray(raw.key_requirements)
      ? raw.key_requirements
      : [],
    full_scope_of_work: String(raw.full_scope_of_work || ''),
    historical_comparison_flags: String(raw.historical_comparison_flags || raw.historical_comparison_notes || ''),
    historical_comparison_notes: String(raw.historical_comparison_flags || raw.historical_comparison_notes || ''),
  };
}

/**
 * Google Gemini 1.5 Flash Extraction (1,000,000 Token Context Window - Ultra Fast & Cost-Effective)
 */
async function extractWithGemini(
  text: string,
  modelName: string,
  apiKey: string
): Promise<TenderStructuredData> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_INSTRUCTION },
            { text: `Here is the full extracted tender document text:\n\n${text}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: TENDER_JSON_SCHEMA.schema,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini returned an empty response');
  }

  return normalizeStructuredData(JSON.parse(rawText));
}

/**
 * OpenAI GPT-4o-mini / GPT-4o Structured Output Extraction
 */
async function extractWithOpenAI(
  text: string,
  modelName: string,
  apiKey: string
): Promise<TenderStructuredData> {
  // Truncate to 120,000 tokens (~400,000 chars) if needed for OpenAI 128k context limit
  const safeText = text.slice(0, 400000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName || 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: `Here is the tender document text:\n\n${safeText}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: TENDER_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 300)}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('OpenAI returned an empty response');
  }

  return normalizeStructuredData(JSON.parse(rawContent));
}

/**
 * Main Structured Extraction Entrypoint
 * Automatically detects Gemini vs OpenAI vs Custom Model from env
 */
export async function extractTenderDataWithLLM(rawText: string): Promise<TenderStructuredData> {
  const modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. If Gemini model configured and key available (Best for 20-100+ pages / 1M token context)
  if (modelName.startsWith('gemini') && geminiKey) {
    return extractWithGemini(rawText, modelName, geminiKey);
  }

  // 2. If OpenAI key available
  if (openaiKey) {
    const actualModel = modelName.startsWith('gemini') ? 'gpt-4o-mini' : modelName;
    return extractWithOpenAI(rawText, actualModel, openaiKey);
  }

  // 3. If Gemini key available as fallback
  if (geminiKey) {
    return extractWithGemini(rawText, 'gemini-1.5-flash', geminiKey);
  }

  throw new Error(
    'No LLM API Key configured. Please set GEMINI_API_KEY (recommended for 100+ page PDFs) or OPENAI_API_KEY in your environment.'
  );
}
