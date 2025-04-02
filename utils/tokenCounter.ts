const AVERAGE_CHARS_PER_TOKEN = 4 // Approximation for English text
const CODE_CHARS_PER_TOKEN = 3.5 // Code tends to have more special characters
const NEWLINE_TOKENS = 1 // Most tokenizers count a newline as 1 token
const WHITESPACE_ADJUSTMENT = 0.85 // Adjustment factor for whitespace

/**
 * Estimates the number of tokens in a text string.
 * This is a more accurate approximation for code-heavy content.
 *
 * @param text The text to count tokens for
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  if (!text) return 0

  // Count newlines for adjustment
  const newlines = (text.match(/\n/g) || []).length

  // Count code blocks which tend to have different tokenization patterns
  const codeBlockMatches = text.match(/```[\s\S]*?```/g) || []
  let codeBlockChars = 0
  codeBlockMatches.forEach((block) => {
    codeBlockChars += block.length
  })

  // Regular text characters (excluding code blocks)
  const regularChars = text.length - codeBlockChars

  // Apply different rates to code and regular text
  const codeTokens = codeBlockChars / CODE_CHARS_PER_TOKEN
  const regularTokens = (regularChars * WHITESPACE_ADJUSTMENT) / AVERAGE_CHARS_PER_TOKEN

  // Add newline tokens
  const newlineTokens = newlines * NEWLINE_TOKENS

  // Sum all token types
  return Math.ceil(codeTokens + regularTokens + newlineTokens)
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

  // For large texts, use a binary search approach to find the right cutoff point
  let low = 0
  let high = text.length
  let mid = 0
  let truncatedText = ""

  while (low <= high) {
    mid = Math.floor((low + high) / 2)
    truncatedText = text.slice(0, mid) + "\n\n[Content truncated to fit token limit]"

    const tokens = countTokens(truncatedText)

    if (tokens > maxTokens) {
      high = mid - 1
    } else if (tokens < maxTokens - 100) {
      // Allow some buffer
      low = mid + 1
    } else {
      // We found a good size
      break
    }
  }

  return truncatedText
}

