export const EXCLUDED_PARTS = [
  // Garment Parts
  'hood',
  'collar',
  'lapel',
  'epaulette',
  'sleeve',
  'pocket',
  'neckline',
  // Closures
  'buckle',
  'zipper',
  // Decorations
  'applique',
  'bead',
  'bow',
  'flower',
  'fringe',
  'ribbon',
  'rivet',
  'ruffle',
  'sequin',
  'tassel',
];

export function normalizeLimit(n: any): number {
  return parseInt(n?.toString() || '50', 10) || 50;
}

export function normalizeOffset(offset: any): string | number | undefined {
  if (!offset || offset === 'undefined' || offset === 'null' || offset === '0') {
    return undefined;
  }
  if (!isNaN(Number(offset))) {
    return Number(offset);
  }
  return offset;
}

export function buildSearchFilters(isGlobalSource: boolean, categoryName?: string, targetPointId?: string | number): any {
  const mustFilters: any[] = [{ key: 'is_global', match: { value: isGlobalSource } }];

  if (!isGlobalSource && categoryName) {
    mustFilters.push({
      key: 'category_name',
      match: { value: categoryName },
    });
  }

  return {
    must: mustFilters,
    must_not: targetPointId ? [{ has_id: [targetPointId] }] : undefined,
  };
}

export function formatHomepageResponse(response: any) {
  const images = (response.points || []).map((point: any) => {
    const p = point.payload as any;
    return {
      image_id: p?.image_id,
      url: `http://localhost:3000/static-images/${p?.url}`,
      width: p?.width,
      height: p?.height,
    };
  });

  return {
    images,
    next_offset: response.next_page_offset || null,
  };
}

export function formatSearchSimilarResponse(
  imageId: number | string,
  targetPoint: any,
  annotationsPoints: any[],
  searchResults: any[],
  n: number,
  offset: number
) {
  const baseUrl = 'http://localhost:3000/static-images';

  return {
    target: {
      image_id: imageId,
      url: `${baseUrl}/${targetPoint.payload?.url}`,
      annotations: annotationsPoints
        .filter((p: any) => {
          const cat = (p.payload as any)?.category_name?.toLowerCase();
          return cat && !EXCLUDED_PARTS.includes(cat);
        })
        .map((p: any) => ({
          id: p.id,
          category: p.payload?.category_name,
          bbox: p.payload?.bbox,
          segmentation: p.payload?.segmentation,
        })),
    },
    results: searchResults.map((res: any) => ({
      point_id: res.id,
      image_id: res.payload?.image_id,
      url: `${baseUrl}/${res.payload?.url}`,
      score: res.score,
      category: res.payload?.category_name,
      width: res.payload?.width,
      height: res.payload?.height,
      description: res.payload?.description,
    })),
    next_offset: searchResults.length === n ? offset + n : null,
  };
}
