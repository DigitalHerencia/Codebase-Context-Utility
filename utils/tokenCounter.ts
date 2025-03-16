// Token counting constants
const AVERAGE_CHARS_PER_TOKEN = 4 // Approximation for English text
const NEWLINE_TOKENS = 1 // Most tokenizers count a newline as 1 token
const WHITESPACE_ADJUSTMENT = 0.8 // Adjustment factor for whitespace

/**
 * Estimates the number of tokens in a text string.
 * This is a simple approximation. For more accurate results,
 * you might want to use a proper tokenizer library.
 *
 * @param text The text to count tokens for
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  if (!text) return 0

  // Count newlines for adjustment
  const newlines = (text.match(/\n/g) || []).length

  // Basic character count
  const charCount = text.length

  // Apply adjustments
  const adjustedCount = charCount * WHITESPACE_ADJUSTMENT + newlines * NEWLINE_TOKENS

  // Convert to tokens
  return Math.ceil(adjustedCount / AVERAGE_CHARS_PER_TOKEN)
}

/**
 * Truncates text to fit within a token limit
 *
 * @param text The text to truncate
 * @param maxTokens Maximum number of tokens allowed
 * @returns Truncated text
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = countTokens(text)

  if (currentTokens <= maxTokens) {
    return text
  }

  // Estimate characters to keep
  const approxCharsToKeep = Math.floor((maxTokens * AVERAGE_CHARS_PER_TOKEN) / WHITESPACE_ADJUSTMENT)

  // Truncate and add indicator
  return text.slice(0, approxCharsToKeep) + "\n\n[Content truncated to fit token limit]"
}

