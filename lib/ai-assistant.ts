import type { Abi } from 'viem';
import { ParsedFunction } from './abi';

export interface AIRecommendation {
  functionName: string;
  functionSignature: string;
  reasoning: string;
  parameterSuggestions: Record<string, string>;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyze user intent and recommend the appropriate smart contract function to call
 */
export async function analyzeUserIntent(
  userRequest: string,
  availableFunctions: ParsedFunction[],
  contractAddress: string,
  contractName?: string
): Promise<AIRecommendation> {
  // Get API key from environment or localStorage
  const apiKey = getAIApiKey();
  
  if (!apiKey) {
    throw new Error('AI API key not configured. Add OPENAI_API_KEY to your environment.');
  }

  // Prepare function descriptions for the AI
  const functionDescriptions = availableFunctions.map((func) => ({
    name: func.name,
    signature: func.signature,
    inputs: func.inputs.map((input) => ({
      name: input.name || 'unnamed',
      type: input.type,
    })),
    stateMutability: func.stateMutability,
    isDangerous: func.isDangerous,
  }));

  const prompt = `You are a smart contract interaction assistant. A user wants to interact with a smart contract and needs help selecting the right function to call.

Contract Address: ${contractAddress}
${contractName ? `Contract Name: ${contractName}` : ''}

User's Request: "${userRequest}"

Available Functions:
${JSON.stringify(functionDescriptions, null, 2)}

Analyze the user's request and recommend:
1. Which function they should call
2. What parameters they should provide (extract from their request when possible)
3. Any warnings or important considerations
4. Your confidence level (high/medium/low)

Respond in JSON format:
{
  "functionName": "exactFunctionName",
  "functionSignature": "functionName(param1Type,param2Type)",
  "reasoning": "Explanation of why this function is the right choice",
  "parameterSuggestions": {
    "paramName": "suggestedValue or description"
  },
  "warnings": ["warning1", "warning2"],
  "confidence": "high" | "medium" | "low"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cheap model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that helps users interact with Ethereum smart contracts. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent responses
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const recommendation: AIRecommendation = JSON.parse(content);

    return recommendation;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

/**
 * Get AI API key from environment or localStorage
 */
function getAIApiKey(): string | null {
  // Try server-side env var first
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Try client-side public env var
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OPENAI_API_KEY) {
    return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  
  // Try localStorage (user-provided key)
  if (typeof window !== 'undefined') {
    return localStorage.getItem('openai_api_key');
  }
  
  return null;
}

