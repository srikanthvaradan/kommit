/**
 * Edge Agent — Crisis Resources
 *
 * This module provides country-appropriate mental health crisis resources
 * for use at the edge (e.g., Vercel Edge Functions). It reads the
 * `x-vercel-ip-country` header to determine the user's country and returns
 * the most relevant local crisis helpline alongside a universal fallback.
 */

/**
 * Represents a set of crisis support resources for a given country.
 */
export interface CrisisResources {
  /** The primary country-specific crisis helpline. */
  primary: { name: string; number: string; url: string };
  /** A universal fallback URL that lists helplines worldwide. */
  universal: string;
}

/**
 * Returns country-appropriate crisis resources based on an ISO 3166-1 alpha-2
 * country code. Falls back to a universal helpline directory for unrecognised
 * country codes.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g. "SG", "US").
 * @returns A {@link CrisisResources} object with a primary helpline and a
 *          universal fallback URL.
 */
export function getCrisisResources(countryCode: string): CrisisResources {
  const universal = "https://findahelpline.com";

  const resourceMap: Record<string, CrisisResources["primary"]> = {
    SG: {
      name: "SOS 24-Hour Hotline",
      number: "1-767",
      url: "https://www.sos.org.sg",
    },
    IN: {
      name: "iCall",
      number: "9152987821",
      url: "https://icallhelpline.org",
    },
    US: {
      name: "988 Suicide & Crisis Lifeline",
      number: "988",
      url: "https://988lifeline.org",
    },
    GB: {
      name: "Samaritans",
      number: "116 123",
      url: "https://www.samaritans.org",
    },
    AU: {
      name: "Lifeline",
      number: "13 11 14",
      url: "https://www.lifeline.org.au",
    },
  };

  const primary: CrisisResources["primary"] = resourceMap[countryCode] ?? {
    name: "Find A Helpline",
    number: "",
    url: "https://findahelpline.com",
  };

  return { primary, universal };
}

/**
 * Extracts the visitor's country code from request headers using the
 * `x-vercel-ip-country` header injected by Vercel's edge network.
 *
 * @param headers - The incoming request {@link Headers} object.
 * @returns The ISO 3166-1 alpha-2 country code string, or `"UNKNOWN"` if the
 *          header is absent or empty.
 */
export function getCountryFromHeaders(headers: Headers): string {
  return headers.get("x-vercel-ip-country") ?? "UNKNOWN";
}