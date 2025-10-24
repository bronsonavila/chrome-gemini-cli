import { Type } from '@google/genai'

/**
 * Schema for extracting and summarizing search results from Google, Bing, etc.
 *
 * Use case: Research, competitive analysis, SEO monitoring
 *
 * Example usage:
 *   npm start -- --schema schemas/examples/search-results-schema.ts "Search for 'best React frameworks 2025' and get top 5 results"
 */
export const searchResultsSchema = {
  properties: {
    query: {
      description: 'The search query used',
      type: Type.STRING
    },
    results: {
      description: 'Array of search results',
      items: {
        properties: {
          description: {
            description: 'Search result snippet or description',
            type: Type.STRING
          },
          title: {
            description: 'Result title',
            type: Type.STRING
          }
        },
        required: ['description', 'title'],
        type: Type.OBJECT
      },
      type: Type.ARRAY
    },
    searchEngine: {
      description: 'Search engine used (Google, Bing, DuckDuckGo, etc.)',
      type: Type.STRING
    },
    totalResults: {
      description: 'Number of results returned',
      type: Type.NUMBER
    }
  },
  required: ['query', 'results', 'totalResults'],
  type: Type.OBJECT
}
