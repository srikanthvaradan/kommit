/**
 * This module implements the SafetyAgent, responsible for classifying input into different categories.
 * It provides a single function, classify, which takes a string input and returns a category.
 */
/**
 * Classifies input into: safe | joyful | sensitive | crisis | unsafe
 * @param input The input string to be classified
 * @returns The category of the input string
 */
function classify(inputString: string): "safe" | "joyful" | "sensitive" | "crisis" | "unsafe" {
  // Crisis patterns are used to identify potentially life-threatening situations
  // If a crisis pattern is found, the function will return "crisis" to trigger emergency response and support
  const crisisPatterns = ["kill myself", "suicide", "self-harm", "want to die", "end my life"];
  // Unsafe patterns are used to identify potentially harmful or malicious input
  // If an unsafe pattern is found, the function will return "unsafe" to trigger caution and monitoring
  const unsafePatterns = ["ignore previous", "you are now", "jailbreak", "ignore instructions"];
  // Joyful patterns are used to identify positive and uplifting input
  // If a joyful pattern is found, the function will return "joyful" to trigger supportive and celebratory response
  const joyfulPatterns = ["so excited", "amazing news", "just got", "we did it", "they said yes"];
  // Sensitive patterns are used to identify potentially sensitive or emotional input
  // If a sensitive pattern is found, the function will return "sensitive" to trigger empathetic and supportive response
  const sensitivePatterns = ["divorce", "grief", "lost my", "funeral", "abuse", "trauma"];

  inputString = inputString.toLowerCase();

  // Check for crisis patterns first, as they require immediate attention
  for (const pattern of crisisPatterns) {
    if (inputString.includes(pattern)) {
      // If a crisis pattern is found, return "crisis" to trigger emergency response and support
      return "crisis"; 
    }
  }

  // Check for unsafe patterns next, as they may pose a risk to the user or system
  for (const pattern of unsafePatterns) {
    if (inputString.includes(pattern)) {
      // If an unsafe pattern is found, return "unsafe" to trigger caution and monitoring
      return "unsafe"; 
    }
  }

  // Check for joyful patterns, as they can help identify positive and uplifting input
  for (const pattern of joyfulPatterns) {
    if (inputString.includes(pattern)) {
      // If a joyful pattern is found, return "joyful" to trigger supportive and celebratory response
      return "joyful"; 
    }
  }

  // Check for sensitive patterns, as they may require empathy and understanding
  for (const pattern of sensitivePatterns) {
    if (inputString.includes(pattern)) {
      // If a sensitive pattern is found, return "sensitive" to trigger empathetic and supportive response
      return "sensitive"; 
    }
  }

  // If no patterns are found, return "safe" to indicate that the input is neutral and does not require special attention
  return "safe"; 
}

export { classify };

