export interface TenderStructuredData {
  tender_id: string;
  project_title_mn: string;
  buyer_name: string;
  sector: 'Барилга' | 'Мэдээллийн технологи' | 'Эрүүл мэнд' | 'Боловсрол' | 'Бусад';
  budget_category: 'under50m' | 'from50to500m' | 'from500mto2b' | 'above2b';
  estimated_budget_mnt: number;
  publish_date: string;
  deadline_year: number;
  key_requirements: string[];
  historical_comparison_notes: string;
}

const TENDER_JSON_SCHEMA = {
  name: 'tender_extraction_schema',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tender_id: {
        type: 'string',
        description: 'The tender ID or invitation number (e.g., МУ-2024/01, ТШ-1234)',
      },
      project_title_mn: {
        type: 'string',
        description: 'The full project/tender title in Mongolian',
      },
      buyer_name: {
        type: 'string',
        description: 'The top buyer / procuring entity (захиалагч)',
      },
      sector: {
        type: 'string',
        enum: ['Барилга', 'Мэдээллийн технологи', 'Эрүүл мэнд', 'Боловсрол', 'Бусад'],
        description: 'Categorize as exactly one of: Барилга, Мэдээллийн технологи, Эрүүл мэнд, Боловсрол, Бусад',
      },
      budget_category: {
        type: 'string',
        enum: ['under50m', 'from50to500m', 'from500mto2b', 'above2b'],
        description: "Calculate from the MNT budget and choose exactly one: 'under50m', 'from50to500m', 'from500mto2b', 'above2b'",
      },
      estimated_budget_mnt: {
        type: 'number',
        description: 'The exact numerical budget in Mongolian Tugriks (MNT)',
      },
      publish_date: {
        type: 'string',
        description: 'Publish date in YYYY-MM-DD format',
      },
      deadline_year: {
        type: 'number',
        description: 'Deadline or target year as a number (e.g., 2024)',
      },
      key_requirements: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'List 3-5 brief technical requirements in Mongolian',
      },
      historical_comparison_notes: {
        type: 'string',
        description: 'Briefly state if this looks like a recurring annual tender or historical patterns',
      },
    },
    required: [
      'tender_id',
      'project_title_mn',
      'buyer_name',
      'sector',
      'budget_category',
      'estimated_budget_mnt',
      'publish_date',
      'deadline_year',
      'key_requirements',
      'historical_comparison_notes',
    ],
    additionalProperties: false,
  },
};

/**
 * OpenAI Structured Outputs ашиглан PDF текстийг шинжлэн бүтэцлэгдсэн өгөгдөл гаргах
 */
export async function extractTenderDataWithLLM(rawText: string): Promise<TenderStructuredData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY орчны хувьсагч тохируулаагүй байна.');
  }

  // Эхний 25,000 тэмдэгтийг сонгож авах (Тендерийн гол баримт бичиг эхэндээ байдаг)
  const trimmedText = rawText.slice(0, 25000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are an expert Mongolian procurement analyst. I will provide the text extracted from a Mongolian government tender document. Analyze the text and return the result STRICTLY as a valid JSON object matching the schema below.`,
        },
        {
          role: 'user',
          content: `Here is the extracted text from the Mongolian government tender document:\n\n${trimmedText}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: TENDER_JSON_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API дуудахад алдаа гарлаа (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('OpenAI хариу хоосон байна');
  }

  const parsedData = JSON.parse(rawContent) as TenderStructuredData;
  return parsedData;
}
