// Products, active demo discounts and 7-day Product performance (docs/DEMO_DATA.md › Products, › Discounts,
// › Product performance (7 days), › Supporting operations-only Seller, › Records created during the demo).
import { etb } from '../money.ts'
import type { Santim } from '../money.ts'
import type { CalendarDate, Moment } from '../time.ts'
import type { Availability } from '../types.ts'
import type { SellerId, StaffId } from './sellers.ts'

export interface VariantGroup {
  /** Absent when DEMO_DATA gives a specification without a name, such as '50 ml'. */
  readonly name?: string
  readonly options: readonly string[]
}

export interface ProductRecord {
  readonly seller: SellerId
  readonly name: string
  /** Regular price. */
  readonly price: Santim
  readonly variants: readonly VariantGroup[]
  /** Stock as at the 10:25 snapshot, after the morning's Orders. */
  readonly stock: number
  readonly availability: Availability
  readonly outOfStockSince?: CalendarDate
  /** Product Quality average and rating count, as at 10:25; null when it has no ratings yet. */
  readonly quality?: { readonly average: number; readonly ratings: number } | null
  /** Explicit approved metadata, set Product by Product; never derived (rule 2.12). */
  readonly locallyMade: boolean
  readonly description?: string
  readonly attributes: readonly string[]
  readonly discount?: { readonly price: Santim; readonly percent: number; readonly status: 'Active'; readonly ends?: CalendarDate }
  /** For records created during the demo. */
  readonly created?: Moment
  readonly createdBy?: StaffId
}

const size = (options: readonly string[]): VariantGroup => ({ name: 'Size', options })
const colour = (options: readonly string[]): VariantGroup => ({ name: 'Colour', options })

const PRODUCT_RECORDS = {
  'PRD-AA-001': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Linen Overshirt', price: etb('2,450.00'),
    variants: [size(['S', 'M', 'L', 'XL']), colour(['Natural', 'Olive'])], stock: 14, availability: 'Available',
    quality: { average: 4.8, ratings: 36 }, locallyMade: true,
    description: 'A relaxed overshirt in washed linen, cut to layer over a tee or under a coat.',
    attributes: ['100% linen', 'relaxed fit', 'made in Addis Ababa', 'hand wash cold'],
  },
  'PRD-AA-002': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Wide-Leg Trousers', price: etb('2,100.00'),
    variants: [size(['S', 'M', 'L', 'XL']), colour(['Sand', 'Charcoal'])], stock: 9, availability: 'Available',
    quality: { average: 4.7, ratings: 24 }, locallyMade: true,
    description: 'High-waisted trousers with a soft wide leg and a side zip.',
    attributes: ['70% cotton, 30% linen', 'made in Addis Ababa'],
  },
  'PRD-AA-003': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Structured Shoulder Bag', price: etb('3,150.00'),
    variants: [colour(['Tan', 'Black'])], stock: 2, availability: 'Low Stock',
    quality: { average: 4.9, ratings: 19 }, locallyMade: true,
    description: 'A firm leather shoulder bag that fits a 13-inch laptop.',
    attributes: ['Full-grain leather', 'inner width 34 cm', 'made in Addis Ababa'],
  },
  'PRD-AA-004': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Cotton Shirt Dress', price: etb('2,750.00'),
    variants: [size(['S', 'M', 'L', 'XL']), colour(['White', 'Indigo'])], stock: 6, availability: 'Available',
    quality: { average: 4.6, ratings: 12 }, locallyMade: true,
    description: 'A belted shirt dress in crisp cotton poplin.',
    attributes: ['100% cotton', 'made in Addis Ababa'],
    discount: { price: etb('2,200.00'), percent: 20, status: 'Active', ends: '2026-10-11' },
  },
  'PRD-AA-005': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Woven Leather Belt', price: etb('950.00'),
    variants: [size(['S', 'M', 'L']), colour(['Brown'])], stock: 0, availability: 'Out of Stock', outOfStockSince: '2026-09-24',
    quality: { average: 4.5, ratings: 9 }, locallyMade: true,
    description: 'A hand-woven leather belt with a brass buckle.',
    attributes: ['Leather and brass', 'made in Addis Ababa'],
  },
  'PRD-NG-001': {
    seller: 'SEL-NURA-GLOW', name: 'Hydrating Face Cream', price: etb('1,350.00'),
    variants: [{ options: ['50 ml'] }], stock: 40, availability: 'Available',
    quality: { average: 4.9, ratings: 88 }, locallyMade: false,
    description: 'A lightweight daily moisturiser.',
    attributes: ['50 ml', 'fragrance-free'],
  },
  'PRD-NG-002': {
    seller: 'SEL-NURA-GLOW', name: 'Lip Tint', price: etb('750.00'),
    variants: [{ name: 'Shade', options: ['Rose', 'Berry', 'Coral'] }], stock: 55, availability: 'Available',
    quality: { average: 4.7, ratings: 64 }, locallyMade: false,
    description: 'A sheer, buildable tint for lips and cheeks.',
    attributes: ['6 ml'],
  },
  'PRD-NG-003': {
    seller: 'SEL-NURA-GLOW', name: 'Gentle Cleanser', price: etb('980.00'),
    variants: [{ options: ['150 ml'] }], stock: 33, availability: 'Available',
    quality: { average: 4.8, ratings: 71 }, locallyMade: false,
    description: 'A low-foam cleanser for morning and evening.',
    attributes: ['150 ml'],
  },
  'PRD-NG-004': {
    seller: 'SEL-NURA-GLOW', name: 'Vitamin C Serum', price: etb('1,650.00'),
    variants: [{ options: ['30 ml'] }], stock: 3, availability: 'Low Stock',
    quality: { average: 4.6, ratings: 22 }, locallyMade: false,
    description: 'A brightening serum for daily use.',
    attributes: ['30 ml'],
  },
  'PRD-NG-005': {
    seller: 'SEL-NURA-GLOW', name: 'Mineral Sunscreen SPF 50', price: etb('1,200.00'),
    variants: [{ options: ['50 ml'] }], stock: 21, availability: 'Available',
    quality: { average: 4.8, ratings: 30 }, locallyMade: false,
    description: 'A mineral sunscreen that wears well under make-up.',
    attributes: ['50 ml', 'SPF 50'],
    discount: { price: etb('1,020.00'), percent: 15, status: 'Active' },
  },
  'PRD-VH-001': {
    seller: 'SEL-VOLT-HOUSE', name: 'Wireless Earbuds', price: etb('3,800.00'),
    variants: [colour(['Black', 'White'])], stock: 12, availability: 'Available',
    quality: { average: 4.5, ratings: 4 }, locallyMade: false,
    description: 'Compact earbuds with a pocket-size charging case.',
    attributes: ['Bluetooth 5.3', 'up to 6 hours per charge'],
  },
  'PRD-VH-002': {
    seller: 'SEL-VOLT-HOUSE', name: 'Compact Power Bank', price: etb('2,900.00'),
    variants: [{ options: ['10,000 mAh'] }, colour(['Black'])], stock: 0, availability: 'Out of Stock',
    quality: null, locallyMade: false,
    description: 'A slim power bank for phones and earbuds.',
    attributes: ['10,000 mAh', 'USB-C in and out'],
  },
  'PRD-VH-003': {
    seller: 'SEL-VOLT-HOUSE', name: 'Phone Stand', price: etb('650.00'),
    variants: [colour(['Grey'])], stock: 24, availability: 'Available',
    quality: { average: 4.7, ratings: 3 }, locallyMade: false,
    description: 'An adjustable aluminium stand for phones and small tablets.',
    attributes: ['Aluminium', 'adjustable angle'],
  },
  'PRD-VH-004': {
    seller: 'SEL-VOLT-HOUSE', name: 'USB-C Fast Charger', price: etb('1,450.00'),
    variants: [{ options: ['30 W'] }], stock: 18, availability: 'Available',
    quality: null, locallyMade: false,
    description: 'A 30 W wall charger for phones and tablets.',
    attributes: ['30 W', 'USB-C'],
  },
  'PRD-VH-005': {
    seller: 'SEL-VOLT-HOUSE', name: 'Braided USB-C Cable', price: etb('450.00'),
    variants: [{ options: ['1.5 m'] }], stock: 60, availability: 'Available',
    quality: null, locallyMade: false,
    description: 'A durable braided USB-C to USB-C cable.',
    attributes: ['1.5 m'],
    discount: { price: etb('360.00'), percent: 20, status: 'Active', ends: '2026-10-15' },
  },
  // Supporting operations-only Seller.
  'PRD-NL-001': {
    seller: 'SEL-NILE-LOOM', name: 'Woven Cotton Throw', price: etb('1,800.00'),
    variants: [colour(['Natural', 'Grey'])], stock: 7, availability: 'Available',
    quality: { average: 3.9, ratings: 21 }, locallyMade: false,
    description: 'A soft woven throw for sofas and beds.',
    attributes: ['100% cotton', '130 × 170 cm'],
  },
  // Created in Flow E at 12:30. DEMO_DATA records no description or Product Quality for it.
  'PRD-AA-006': {
    seller: 'SEL-ADDIS-ATELIER', name: 'Linen Midi Skirt', price: etb('1,950.00'),
    variants: [size(['S', 'M', 'L', 'XL']), colour(['Natural'])], stock: 10, availability: 'Available',
    locallyMade: true,
    attributes: ['made in Addis Ababa'],
    created: { at: '2026-10-02T12:30:00+03:00', sequence: 1 }, createdBy: 'STF-AA-01',
  },
} satisfies Record<string, ProductRecord>

export type ProductId = keyof typeof PRODUCT_RECORDS
export const PRODUCTS: Readonly<Record<ProductId, ProductRecord>> = PRODUCT_RECORDS
export const PRODUCT_IDS = Object.keys(PRODUCT_RECORDS) as ProductId[]

/**
 * Product performance over the 7 days to 10:25 on 2 October (specification §31). Screens show these figures and don't
 * compute their own. GMV is units sold × the price paid; no unit sold at a discounted price.
 */
export const PRODUCT_PERFORMANCE_7D: Readonly<Partial<Record<ProductId, { readonly views: number; readonly unitsSold: number; readonly gmv: Santim }>>> = {
  'PRD-AA-001': { views: 430, unitsSold: 4, gmv: etb('9,800.00') },
  'PRD-AA-002': { views: 250, unitsSold: 1, gmv: etb('2,100.00') },
  'PRD-AA-003': { views: 210, unitsSold: 0, gmv: etb('0.00') },
  'PRD-AA-004': { views: 190, unitsSold: 1, gmv: etb('2,750.00') },
  'PRD-AA-005': { views: 100, unitsSold: 0, gmv: etb('0.00') },
  'PRD-NG-001': { views: 820, unitsSold: 6, gmv: etb('8,100.00') },
  'PRD-NG-002': { views: 900, unitsSold: 10, gmv: etb('7,500.00') },
  'PRD-NG-003': { views: 520, unitsSold: 3, gmv: etb('2,940.00') },
  'PRD-NG-004': { views: 430, unitsSold: 2, gmv: etb('3,300.00') },
  'PRD-NG-005': { views: 290, unitsSold: 0, gmv: etb('0.00') },
  'PRD-VH-001': { views: 140, unitsSold: 1, gmv: etb('3,800.00') },
  'PRD-VH-002': { views: 40, unitsSold: 0, gmv: etb('0.00') },
  'PRD-VH-003': { views: 90, unitsSold: 1, gmv: etb('650.00') },
  'PRD-VH-004': { views: 95, unitsSold: 1, gmv: etb('1,450.00') },
  'PRD-VH-005': { views: 55, unitsSold: 0, gmv: etb('0.00') },
}
