/* ================================================
   PRICHOY — API Client (Phase 3.1)
   Talks to the real backend instead of the hardcoded
   PRODUCTS array / localStorage-only checkout that
   shipped with the original static demo.
   ================================================ */

// Update this if the backend API isn't served from the same origin/proxy path.
const API_BASE = window.PRICHOY_API_BASE || '/api';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let json;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error('Unexpected response from server');
  }
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Something went wrong');
  }
  return json;
}

const api = {
  // GET /api/public/products?gender=&category=&search=&sort=&page=&limit=
  getProducts(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiRequest(`/public/products${qs ? `?${qs}` : ''}`);
  },

  getProductBySlug(slug) {
    return apiRequest(`/public/products/${encodeURIComponent(slug)}`);
  },

  getCategories() {
    return apiRequest('/public/categories');
  },

  validateCoupon(code, subtotal) {
    return apiRequest('/public/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  },

  // Server re-validates and re-prices everything — this is a convenience
  // payload, not the source of truth for what the customer gets charged.
  createOrder(payload) {
    return apiRequest('/public/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

/**
 * Adapts a backend product (Phase 3 schema: colors[], variants[],
 * images[], sellingPrice/salePrice) into the flat shape the existing
 * render functions in app.js already know how to draw (id, name, price,
 * originalPrice, image, colors:[hex...], sizes:[...], etc.) — done so the
 * existing card/grid/PDP markup and CSS didn't need to be rewritten, only
 * the data source underneath them.
 *
 * Real ratings/reviews don't exist in the backend (no review system was
 * built) — rather than fabricate numbers for a real business, `rating`/
 * `reviews` are simply omitted, and app.js's rendering already guards for
 * that (see renderStars()).
 */
function adaptProduct(p) {
  const price = Number(p.salePrice ?? p.sellingPrice);
  const originalPrice = p.salePrice ? Number(p.sellingPrice) : null;

  // Distinct color swatches, sourced from ProductColor when the product
  // uses per-color variants, falling back to a single neutral swatch
  // otherwise so the existing color-dot UI doesn't render empty.
  const colors = (p.colors && p.colors.length)
    ? p.colors.map((c) => ({ id: c.id, hex: c.hexCode || '#999', name: c.name, images: c.images }))
    : [{ id: null, hex: '#2a2a2a', name: 'Default', images: [] }];

  // Distinct sizes across all variants (a variant is one color+size
  // combination; the PDP picks the matching variant once both are chosen).
  const sizes = [...new Set((p.variants || []).map((v) => v.value))];

  const primaryImage = p.images?.find((i) => i.isPrimary) || p.images?.[0];

  return {
    id: p.id,
    slug: p.slug,
    gender: (p.gender || 'unisex').toLowerCase(),
    name: p.name,
    category: p.category?.name || '',
    categorySlug: p.category?.slug || '',
    price,
    originalPrice,
    image: primaryImage?.url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&q=80',
    images: p.images || [],
    badge: p.labels?.includes('NEW') ? 'New' : p.labels?.includes('SALE') ? 'Sale' : (p.labels?.[0] ? p.labels[0].replace('_', ' ') : null),
    labels: p.labels || [],
    colors,
    sizes: sizes.length ? sizes : ['One Size'],
    variants: p.variants || [],
    description: p.description || p.shortDescription || '',
    shortDescription: p.shortDescription || '',
    fabric: p.material || '',
    care: p.careInstructions || '',
    season: p.season || '',
    countryOfOrigin: p.countryOfOrigin || '',
    sizeGuide: p.sizeGuide || null,
    discount: null, // coupon auto-apply isn't a per-product backend concept — see couponService
  };
}

/** Finds the specific Variant row for a chosen size (+ optional color), for stock/price lookups and the real productId/variantId checkout needs. */
function findVariant(product, size, colorId) {
  if (!product.variants || !product.variants.length) return null;
  return product.variants.find((v) =>
    v.value === size && (colorId ? v.colorId === colorId : true)
  ) || product.variants.find((v) => v.value === size) || null;
}
