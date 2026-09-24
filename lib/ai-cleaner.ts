/**
 * Strips internal AI thinking blocks, scratchpads, and reasoning headers
 * to ensure users only see polished, user-facing responses.
 */
export function cleanThoughtBlocks(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Strip <think>...</think> tags (including multiline)
  cleaned = cleaned.replace(/<think[\s\S]*?<\/think>/gi, '');
  // Unclosed <think> tag at start or end
  cleaned = cleaned.replace(/^<think[\s\S]*$/gi, '');

  // 2. Strip <scratchpad>...</scratchpad>
  cleaned = cleaned.replace(/<scratchpad[\s\S]*?<\/scratchpad>/gi, '');

  // 3. Strip [THINKING]...[/THINKING] or [REASONING]...[/REASONING]
  cleaned = cleaned.replace(/\[(THINKING|REASONING)\][\s\S]*?\[\/\1\]/gi, '');

  // 4. Strip markdown formatted thinking blocks: ### Thinking Process ...
  cleaned = cleaned.replace(/###\s*(?:Thinking Process|Thought Process|Reasoning)[\s\S]*?(?=(?:###\s*(?!Thinking|Thought|Reasoning)|##\s*|#\s*|\n\n[А-ЯA-Z1-9💡📌📦🛡️🟢✅⚠️]))/gi, '');

  // 5. Strip "Here's a thinking process:" / "Here is my thought process:"
  if (/^(?:Here(?:'s| is) (?:a |my )?(?:thinking process|thought process|reasoning):?|Thinking Process:?|Thought Process:?)/i.test(cleaned.trim())) {
    // Try to find where the actual response starts
    const lines = cleaned.split(/\r?\n/);
    let responseStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for markdown headings, bold titles, bullet points with content, or emojis
      const isHeading = /^(?:#{1,4}\s+|[💡📌📦🛡️🟢✅⚠️❌🏆📊🔍]|\*\*[^*]+\*\*)/.test(line);
      const isMongolianContent = /[А-ЯӨҮа-яөү]{4,}/.test(line) && !/(шинжлэх|бодох|төлөвлөх|think|analyze|determine|identify)/i.test(line);
      const isDraftingLead = /^(?:Let(?:'s)? draft|Here is the response|Response:)/i.test(line);

      // If line looks like actual response start and not a thinking instruction
      if (
        (isHeading || (isMongolianContent && !line.includes(':'))) &&
        !/^(?:analyze|identify|determine|formulate|draft|key data|user wants|user input|step \d)/i.test(line)
      ) {
        responseStartIndex = i;
        break;
      }

      if (isDraftingLead) {
        responseStartIndex = i + 1;
        break;
      }
    }

    if (responseStartIndex > 0 && responseStartIndex < lines.length) {
      cleaned = lines.slice(responseStartIndex).join('\n');
    } else {
      // Fallback regex strip
      cleaned = cleaned.replace(/^(?:Here(?:'s| is) (?:a |my )?(?:thinking process|thought process|reasoning):?|Thinking Process:?|Thought Process:?)[\s\S]*?(?=(?:\n\n|\r\n\r\n)(?:###|##|#|\*\*|[А-ЯA-Z1-9💡📌📦🛡️🟢✅⚠️]))/i, '');
    }
  }

  // 6. Clean leading/trailing artifacts
  cleaned = cleaned.replace(/^[\s\r\n]+/, '').replace(/[\s\r\n]+$/, '');

  return cleaned;
}
