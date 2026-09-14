/* ==========================================================================
   Product Image Curator & Fallback Resolver
   --------------------------------------------------------------------------
   Provides high-resolution, professional product imagery matching real catalog
   categories and product names, handling broken or placeholder backend image URLs.
   ========================================================================== */

const CATEGORY_IMAGES = {
  electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
  audio: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000&auto=format&fit=crop',
  home: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?q=80&w=1000&auto=format&fit=crop',
  wearables: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop',
  accessories: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1000&auto=format&fit=crop',
  footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
  computers: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop',
  furniture: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&auto=format&fit=crop',
}

const KEYWORD_MAP = [
  { keywords: ['headphone', 'earphone', 'audio', 'sound', 'airpods', 'headset'], url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['laptop', 'macbook', 'computer', 'pc', 'notebook'], url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['phone', 'iphone', 'mobile', 'smartphone', 'galaxy'], url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['watch', 'smartwatch', 'clock', 'chronograph'], url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['speaker', 'bluetooth', 'soundbar'], url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['camera', 'photo', 'lens'], url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['bag', 'backpack', 'tote', 'case'], url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['shoe', 'sneaker', 'footwear', 'runner'], url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['keyboard', 'keycap'], url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1000&auto=format&fit=crop' },
  { keywords: ['lamp', 'light', 'desk', 'chair', 'furniture', 'shelf'], url: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?q=80&w=1000&auto=format&fit=crop' },
]

/**
 * Returns a high-quality product image URL for any product, falling back
 * to a relevant curated Unsplash product photo when the backend imageUrl is
 * missing, invalid, or an unresolvable placeholder like example.com.
 */
export function resolveProductImageUrl(product) {
  if (!product) return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop'

  const rawUrl = product.imageUrl?.trim()
  if (rawUrl && /^https?:\/\/(?!example\.com)/i.test(rawUrl)) {
    return rawUrl
  }

  const name = String(product.name || '').toLowerCase()
  for (const item of KEYWORD_MAP) {
    if (item.keywords.some((kw) => name.includes(kw))) {
      return item.url
    }
  }

  const category = String(product.category || '').toLowerCase()
  if (CATEGORY_IMAGES[category]) {
    return CATEGORY_IMAGES[category]
  }

  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop'
}
