// Generated from the SUBMITTED, UNRATIFIED taxonomy archive (SHA-256 377aba802a39b0b37c4066cb37254fe01184c80bea787336f3607492147c47a9), manifest TAXSRC-v1.
// Nothing here establishes that any attribute is required, searchable, filterable or Variant-defining (TX-01..TX-10 are open).
// Fashion has subcategory lists for 6 of its 9 categories; Cosmetics and Electronics have category names only.
// Attribute definitions (66 subcategories) live in taxonomy-attributes.json and load on demand.

export interface TaxonomySubcategory { readonly id: string; readonly name: string; readonly attributes: boolean }
export interface TaxonomyCategory { readonly id: string; readonly name: string; readonly subcategories: readonly TaxonomySubcategory[]; readonly hasSubcategoryList: boolean }
export interface TaxonomyMajor { readonly id: string; readonly name: string; readonly categories: readonly TaxonomyCategory[] }
export interface TaxonomyAttribute { readonly name: string; readonly values: readonly string[] }

export const TAXONOMY: readonly TaxonomyMajor[] = [
 {
  "id": "fashion",
  "name": "Fashion",
  "categories": [
   {
    "id": "fashion/womens-clothing",
    "name": "Women’s Clothing",
    "subcategories": [
     {
      "id": "fashion/womens-clothing/dresses",
      "name": "Dresses",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/tops",
      "name": "Tops",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/bottoms",
      "name": "Bottoms",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/jumpsuits-and-rompers",
      "name": "Jumpsuits & Rompers",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/matching-sets",
      "name": "Matching Sets",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/suits-and-blazers",
      "name": "Suits & Blazers",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/jackets-and-coats",
      "name": "Jackets & Coats",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/activewear",
      "name": "Activewear",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/loungewear-and-sleepwear",
      "name": "Loungewear & Sleepwear",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/underwear-and-lingerie",
      "name": "Underwear & Lingerie",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/swimwear",
      "name": "Swimwear",
      "attributes": true
     },
     {
      "id": "fashion/womens-clothing/maternity-clothing",
      "name": "Maternity Clothing",
      "attributes": true
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/mens-clothing",
    "name": "Men’s Clothing",
    "subcategories": [
     {
      "id": "fashion/mens-clothing/tops",
      "name": "Tops",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/bottoms",
      "name": "Bottoms",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/suits-and-blazers",
      "name": "Suits & Blazers",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/jackets-and-coats",
      "name": "Jackets & Coats",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/activewear",
      "name": "Activewear",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/loungewear-and-sleepwear",
      "name": "Loungewear & Sleepwear",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/underwear",
      "name": "Underwear",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/matching-sets",
      "name": "Matching Sets",
      "attributes": true
     },
     {
      "id": "fashion/mens-clothing/traditional-clothing",
      "name": "Traditional Clothing",
      "attributes": true
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/kids-clothing",
    "name": "Kids’ Clothing",
    "subcategories": [
     {
      "id": "fashion/kids-clothing/dresses",
      "name": "Dresses",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/tops",
      "name": "Tops",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/bottoms",
      "name": "Bottoms",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/jumpsuits-and-rompers",
      "name": "Jumpsuits & Rompers",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/matching-sets",
      "name": "Matching Sets",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/suits-and-formalwear",
      "name": "Suits & Formalwear",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/jackets-and-coats",
      "name": "Jackets & Coats",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/activewear",
      "name": "Activewear",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/loungewear-and-sleepwear",
      "name": "Loungewear & Sleepwear",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/underwear",
      "name": "Underwear",
      "attributes": true
     },
     {
      "id": "fashion/kids-clothing/swimwear",
      "name": "Swimwear",
      "attributes": false
     },
     {
      "id": "fashion/kids-clothing/school-uniforms",
      "name": "School Uniforms",
      "attributes": false
     },
     {
      "id": "fashion/kids-clothing/traditional-clothing",
      "name": "Traditional Clothing",
      "attributes": false
     },
     {
      "id": "fashion/kids-clothing/baby-clothing",
      "name": "Baby Clothing",
      "attributes": false
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/shoes",
    "name": "Shoes",
    "subcategories": [
     {
      "id": "fashion/shoes/womens-shoes",
      "name": "Women's Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/mens-shoes",
      "name": "Men's Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/kids-shoes",
      "name": "Kids' Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/baby-and-toddler-shoes",
      "name": "Baby & Toddler Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/unisex-shoes",
      "name": "Unisex Shoes",
      "attributes": false
     },
     {
      "id": "fashion/shoes/sports-and-athletic-shoes",
      "name": "Sports & Athletic Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/work-and-safety-shoes",
      "name": "Work & Safety Shoes",
      "attributes": true
     },
     {
      "id": "fashion/shoes/traditional-and-cultural-footwear",
      "name": "Traditional & Cultural Footwear",
      "attributes": true
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/bags",
    "name": "Bags",
    "subcategories": [
     {
      "id": "fashion/bags/womens-bags",
      "name": "Women's Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/mens-bags",
      "name": "Men's Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/kids-bags",
      "name": "Kids' Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/backpacks",
      "name": "Backpacks",
      "attributes": true
     },
     {
      "id": "fashion/bags/travel-bags-and-luggage",
      "name": "Travel Bags & Luggage",
      "attributes": true
     },
     {
      "id": "fashion/bags/business-and-laptop-bags",
      "name": "Business & Laptop Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/sports-and-gym-bags",
      "name": "Sports & Gym Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/school-bags",
      "name": "School Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/baby-and-diaper-bags",
      "name": "Baby & Diaper Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/shopping-and-reusable-bags",
      "name": "Shopping & Reusable Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/outdoor-and-utility-bags",
      "name": "Outdoor & Utility Bags",
      "attributes": false
     },
     {
      "id": "fashion/bags/camera-and-equipment-bags",
      "name": "Camera & Equipment Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/traditional-and-cultural-bags",
      "name": "Traditional & Cultural Bags",
      "attributes": true
     },
     {
      "id": "fashion/bags/wallets-purses-and-card-holders",
      "name": "Wallets, Purses & Card Holders",
      "attributes": true
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/jewellery",
    "name": "Jewellery",
    "subcategories": [
     {
      "id": "fashion/jewellery/necklaces-and-pendants",
      "name": "Necklaces & Pendants",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/earrings",
      "name": "Earrings",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/rings",
      "name": "Rings",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/bracelets",
      "name": "Bracelets",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/anklets",
      "name": "Anklets",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/brooches-and-pins",
      "name": "Brooches & Pins",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/charms-and-beads",
      "name": "Charms & Beads",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/body-jewellery",
      "name": "Body Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/hair-jewellery",
      "name": "Hair Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/jewellery-sets",
      "name": "Jewellery Sets",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/mens-jewellery",
      "name": "Men's Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/kids-jewellery",
      "name": "Kids' Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/bridal-and-wedding-jewellery",
      "name": "Bridal & Wedding Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/religious-and-spiritual-jewellery",
      "name": "Religious & Spiritual Jewellery",
      "attributes": true
     },
     {
      "id": "fashion/jewellery/traditional-and-cultural-jewellery",
      "name": "Traditional & Cultural Jewellery",
      "attributes": true
     }
    ],
    "hasSubcategoryList": true
   },
   {
    "id": "fashion/accessories",
    "name": "Accessories",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "fashion/shapewear",
    "name": "Shapewear",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "fashion/traditional-clothing",
    "name": "Traditional Clothing",
    "subcategories": [],
    "hasSubcategoryList": false
   }
  ]
 },
 {
  "id": "cosmetics",
  "name": "Cosmetics",
  "categories": [
   {
    "id": "cosmetics/makeup",
    "name": "Makeup",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/skincare",
    "name": "Skincare",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/hair",
    "name": "Hair",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/haircare",
    "name": "Haircare",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/fragrance",
    "name": "Fragrance",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/bath-and-body",
    "name": "Bath & Body",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "cosmetics/personal-care",
    "name": "Personal Care",
    "subcategories": [],
    "hasSubcategoryList": false
   }
  ]
 },
 {
  "id": "electronics",
  "name": "Electronics",
  "categories": [
   {
    "id": "electronics/mobile-phones",
    "name": "Mobile Phones",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/computers",
    "name": "Computers",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/tablets",
    "name": "Tablets",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/phone-accessories",
    "name": "Phone Accessories",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/computer-accessories",
    "name": "Computer Accessories",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/audio",
    "name": "Audio",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/cameras",
    "name": "Cameras",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/tvs-and-entertainment",
    "name": "TVs & Entertainment",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/smart-devices",
    "name": "Smart Devices",
    "subcategories": [],
    "hasSubcategoryList": false
   },
   {
    "id": "electronics/chargers-and-power",
    "name": "Chargers & Power",
    "subcategories": [],
    "hasSubcategoryList": false
   }
  ]
 }
]

/** Source facts about the gaps, for the founder / CMO / CSO review register. */
export const TAXONOMY_GAPS = {
  categoriesWithoutSubcategoryList: 20,
  subcategoriesWithoutAttributeWorkbook: 6,
  status: 'SUBMITTED, UNRATIFIED',
} as const

/** Attribute definitions for a leaf subcategory id, or null when none were submitted. Loaded on demand (large). */
export async function attributesFor(id: string): Promise<readonly TaxonomyAttribute[] | null> {
  const all = (await import('./taxonomy-attributes.json')).default as Record<string, TaxonomyAttribute[]>
  return all[id] ?? null
}

export function findTaxonomy(id: string | null) {
  if (!id) return null
  const parts = id.split('/')
  const major = TAXONOMY.find(m => m.id === parts[0])
  const category = major?.categories.find(c => c.id === `${parts[0]}/${parts[1]}`)
  const sub = category?.subcategories.find(s => s.id === id)
  return { major, category, sub, label: [major?.name, category?.name, sub?.name].filter(Boolean).join(' › ') }
}
