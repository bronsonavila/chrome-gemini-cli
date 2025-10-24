import { Type } from '@google/genai'

/**
 * Schema for extracting multiple products from a listing or search results page.
 *
 * Use case: Competitive analysis, price comparison, inventory monitoring
 *
 * Example usage:
 *   npm start -- --schema schemas/examples/product-listing-schema.ts "Get the top 5 laptops from bestbuy.com"
 */
export const productListingSchema = {
  properties: {
    products: {
      description: 'Array of products found',
      items: {
        properties: {
          name: {
            description: 'Product name or title',
            type: Type.STRING
          },
          price: {
            description: 'Product price',
            type: Type.STRING
          },
          rating: {
            description: 'Average customer rating (0-5 scale)',
            nullable: true,
            type: Type.NUMBER
          }
        },
        required: ['name', 'price'],
        type: Type.OBJECT
      },
      type: Type.ARRAY
    },
    source: {
      description: 'Website or page where products were found',
      nullable: true,
      type: Type.STRING
    },
    totalFound: {
      description: 'Total number of products extracted',
      type: Type.NUMBER
    }
  },
  required: ['products', 'totalFound'],
  type: Type.OBJECT
}
