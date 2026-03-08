import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 💡 제외할 세부 부위 리스트 정의 (메인 카테고리만 남기기 위함)
const EXCLUDED_PARTS = [
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

@Injectable()
export class SearchService implements OnModuleInit {
  private qdrantClient: QdrantClient;
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    this.qdrantClient = new QdrantClient({
      url: 'http://localhost:6333',
    });
    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async onModuleInit() {
    console.log('✅ SearchService initialized. Qdrant is ready.');
  }

  async getHomepageFeed(n: any = 50, offset?: string | number) {
    try {
      // 💡 1. n(limit)을 확실하게 정수로 변환 (400 에러 방지 핵심)
      const limit = parseInt(n.toString(), 10) || 50;

      // 💡 2. offset 타입 정규화
      let scrollOffset: any = offset;
      if (
        !offset ||
        offset === 'undefined' ||
        offset === 'null' ||
        offset === '0'
      ) {
        scrollOffset = undefined;
      } else if (!isNaN(Number(offset))) {
        // 숫자 형태의 문자열("17880")이면 반드시 숫자로 변환
        scrollOffset = Number(offset);
      }
      // UUID 형태("6b959af7...")는 문자열 그대로 유지

      const response = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: { must: [{ key: 'is_global', match: { value: true } }] },
        limit: limit, // 💡 정수 전달
        offset: scrollOffset, // 💡 정규화된 타입 전달
        with_payload: true,
      });

      const images = (response.points || []).map((point) => {
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
    } catch (error) {
      // 💡 에러 로그를 상세히 찍어 Qdrant가 왜 화가 났는지 확인합니다.
      console.error('❌ Qdrant Scroll Error:', error);
      return { images: [], next_offset: null };
    }
  }

  async searchSimilarItems(
    imageId: number,
    annId?: string | number,
    n = 50,
    offset = 0,
  ) {
    // 💡 offset 파라미터 추가
    try {
      let targetPoint: any;

      // 1. 기준 포인트 조회 (기존 로직 유지)
      if (annId && annId !== 'undefined') {
        const pointResult = await this.qdrantClient.retrieve(
          'fashionpedia_v1',
          {
            ids: [annId as string],
            with_vector: true,
            with_payload: true,
          },
        );
        if (pointResult.length > 0) targetPoint = pointResult[0];
      }

      if (!targetPoint) {
        const targetResponse = await this.qdrantClient.scroll(
          'fashionpedia_v1',
          {
            filter: {
              must: [
                { key: 'image_id', match: { value: imageId } },
                { key: 'is_global', match: { value: true } },
              ],
            },
            limit: 1,
            with_vector: true,
          },
        );
        targetPoint = targetResponse.points[0];
      }

      if (!targetPoint) throw new Error('기준 아이템을 찾을 수 없습니다.');

      const targetVector = targetPoint.vector as number[];
      const isGlobalSource = targetPoint.payload?.is_global;
      const categoryName = targetPoint.payload?.category_name;

      // 2. 동적 검색 필터 구축
      const mustFilters: any[] = [
        { key: 'is_global', match: { value: isGlobalSource } },
      ];

      if (!isGlobalSource && categoryName) {
        mustFilters.push({
          key: 'category_name',
          match: { value: categoryName },
        });
      }

      // 3. 유사 아이템 검색 실행 (offset 반영)
      const searchResults = await this.qdrantClient.search('fashionpedia_v1', {
        vector: targetVector,
        limit: n,
        offset: offset, // 💡 페이지네이션 오프셋 적용
        filter: {
          must: mustFilters,
          must_not: [{ has_id: [targetPoint.id] }],
        },
        with_payload: true,
      });

      const baseUrl = 'http://localhost:3000/static-images';

      return {
        target: {
          image_id: imageId,
          url: `${baseUrl}/${targetPoint.payload?.url}`,
          annotations: (
            await this.qdrantClient.scroll('fashionpedia_v1', {
              filter: {
                must: [
                  { key: 'image_id', match: { value: imageId } },
                  { key: 'is_global', match: { value: false } },
                ],
              },
              with_payload: true,
            })
          ).points
            .filter((p) => {
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
        // 💡 다음 페이지 조회를 위한 힌트 (결과가 limit만큼 왔다면 더 있다고 가정)
        next_offset: searchResults.length === n ? offset + n : null,
      };
    } catch (error) {
      console.error('❌ Search Error:', error);
      throw error;
    }
  }
}
