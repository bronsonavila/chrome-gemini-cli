import { Type } from '@google/genai'

/**
 * Schema for extracting product price information from websites.
 *
 * Use case: Price checking, comparison shopping, monitoring
 *
 * Example usage:
 *   npm start -- --schema schemas/examples/price-schema.ts "Get the price of the latest iPhone from apple.com"
 */
export const priceSchema = {
  properties: {
    available: {
      description: 'Whether the product is currently available for purchase',
      type: Type.BOOLEAN
    },
    currency: {
      description: 'Currency code (USD, EUR, GBP, etc.)',
      type: Type.STRING
    },
    price: {
      description: 'Price with currency symbol (e.g., "$999" or "999")',
      type: Type.STRING
    },
    product: {
      description: 'Full product name',
      type: Type.STRING
    },
    url: {
      description: 'Direct URL to the product page',
      type: Type.STRING
    }
  },
  required: ['product', 'price'],
  type: Type.OBJECT
}
