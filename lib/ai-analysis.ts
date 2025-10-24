/**
 * AI-powered contract function analysis using OpenAI
 * Provides deeper insights beyond parameter parsing
 */

export interface AIAnalysis {
  summary: string;
  risks: string[];
  recommendations: string[];
  explanation: string;
}

/**
 * Analyze a contract function using AI
 */
export async function analyzeWithAI(
  functionName: string,
  functionSignature: string,
  parameters: any[],
  parameterNames: string[],
  natspec?: string
): Promise<AIAnalysis | null> {
  // Get API key from localStorage (user-provided)
  const apiKey = typeof window !== 'undefined' 
    ? localStorage.getItem('openai_api_key') 
    : null;

  if (!apiKey) {
    return null; // AI analysis is optional
  }

  try {
    // Build context for AI
    const context = `
Contract Function: ${functionName}
Signature: ${functionSignature}
${natspec ? `Documentation: ${natspec}` : ''}

Parameters:
${parameters.map((param, idx) => `  ${parameterNames[idx] || `param${idx}`}: ${formatParamForAI(param)}`).join('\n')}

Task: Analyze this smart contract function call and provide:
1. A brief summary of what this function does
2. Any security risks or concerns
3. Recommendations for the user
4. A clear explanation of the expected outcome

Keep responses concise and user-friendly. Focus on what matters to someone interacting with this contract.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: 'You are a smart contract security expert helping users understand what will happen when they execute a transaction. Be concise, clear, and focus on practical implications.',
          },
          {
            role: 'user',
            content: context,
          },
        ],
        temperature: 0.3, // More deterministic
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Parse AI response (assuming structured format)
    const analysis = parseAIResponse(content);
    return analysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}

/**
 * Format parameter value for AI context
 */
function formatParamForAI(param: any): string {
  if (typeof param === 'bigint') {
    return param.toString();
  }
  if (typeof param === 'string' && param.startsWith('0x')) {
    return `${param.slice(0, 10)}...${param.slice(-8)}`;
  }
  if (Array.isArray(param)) {
    return `Array[${param.length}]`;
  }
  return String(param);
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(content: string): AIAnalysis {
  const lines = content.split('\n').filter(line => line.trim());
  
  let summary = '';
  const risks: string[] = [];
  const recommendations: string[] = [];
  let explanation = '';
  
  let currentSection: 'summary' | 'risks' | 'recommendations' | 'explanation' | null = null;
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (lower.includes('summary') || lower.includes('what this does')) {
      currentSection = 'summary';
      continue;
    } else if (lower.includes('risk') || lower.includes('concern') || lower.includes('warning')) {
      currentSection = 'risks';
      continue;
    } else if (lower.includes('recommend') || lower.includes('suggestion') || lower.includes('best practice')) {
      currentSection = 'recommendations';
      continue;
    } else if (lower.includes('explanation') || lower.includes('outcome') || lower.includes('will happen')) {
      currentSection = 'explanation';
      continue;
    }
    
    // Add content to current section
    const cleanLine = line.replace(/^[-*•]\s*/, '').trim();
    
    if (!cleanLine || cleanLine.startsWith('#')) continue;
    
    switch (currentSection) {
      case 'summary':
        summary += (summary ? ' ' : '') + cleanLine;
        break;
      case 'risks':
        if (cleanLine.length > 5) risks.push(cleanLine);
        break;
      case 'recommendations':
        if (cleanLine.length > 5) recommendations.push(cleanLine);
        break;
      case 'explanation':
        explanation += (explanation ? ' ' : '') + cleanLine;
        break;
    }
  }
  
  // Fallback: if sections weren't parsed well, use the whole content as explanation
  if (!summary && !explanation) {
    explanation = content;
  }
  
  return {
    summary: summary || 'AI analysis completed',
    risks: risks.length > 0 ? risks : ['No specific risks identified'],
    recommendations: recommendations.length > 0 ? recommendations : ['Review the transaction details carefully before confirming'],
    explanation: explanation || summary || content,
  };
}

