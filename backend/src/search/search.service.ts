import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 💡 제외할 세부 부위 리스트 정의 (메인 카테고리만 남기기 위함)
const EXCLUDED_PARTS = [
  'sleeve',
  'pocket',
  'zipper',
  'button',
  'collar',
  'lapel',
  'cuff',
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

  async getHomepageFeed(n = 100, offset?: string | number) {
    try {
      const scrollOffset =
        offset === 0 || !offset ? undefined : offset.toString();

      const response = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: {
          must: [{ key: 'is_global', match: { value: true } }],
        },
        limit: n,
        offset: scrollOffset,
        with_payload: true,
        with_vector: false,
      });

      const images = response.points.map((point) => {
        const p = point.payload as any;
        const fileName = p?.url as string;
        return {
          image_id: p?.image_id as number,
          url: `http://localhost:3000/static-images/${fileName}`,
        };
      });

      return {
        images,
        next_offset: response.next_page_offset,
      };
    } catch (error) {
      console.error('❌ Qdrant Scroll Error:', error);
      throw error;
    }
  }

  // backend/src/search/search.service.ts

  async searchSimilarItems(imageId: number, annId?: string | number, n = 100) {
    try {
      let targetPoint: any;

      // 1. 기준 포인트 조회 (기존 로직 유지)
      // 💡 수정된 부분: annId가 있을 경우 'annotation_id' 필드로 검색합니다.
      // 💡 1. annId가 UUID 문자열이므로 retrieve를 사용해 즉시 조회
      if (annId && annId !== 'undefined') {
        const pointResult = await this.qdrantClient.retrieve(
          'fashionpedia_v1',
          {
            ids: [annId], // 💡 UUID로 직접 조회
            with_vector: true,
            with_payload: true,
          },
        );
        if (pointResult.length > 0) targetPoint = pointResult[0];
      }

      // 💡 2. ID 조회가 실패했을 때만 Global 스타일로 Fallback
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
      const isGlobalSource = targetPoint.payload?.is_global; // 💡 기준이 전체 사진인가?
      const categoryName = targetPoint.payload?.category_name; // 💡 기준 아이템의 카테고리 (셔츠, 신발 등)

      console.log(
        `--- [ID: ${annId || 'Global'}] Vector Preview:`,
        targetVector.slice(0, 5),
      );

      // 💡 2. 동적 검색 필터 구축 (핵심 로직)
      const mustFilters: any[] = [
        { key: 'is_global', match: { value: isGlobalSource } }, // 💡 전체 사진이면 전체 사진끼리, 조각이면 조각끼리 검색
      ];

      // 💡 아이템(셔츠/신발 등) 검색일 경우, 같은 카테고리 안에서만 찾도록 필터 추가
      if (!isGlobalSource && categoryName) {
        mustFilters.push({
          key: 'category_name',
          match: { value: categoryName },
        });
      }

      // 3. 유사 아이템 검색 실행
      const searchResults = await this.qdrantClient.search('fashionpedia_v1', {
        vector: targetVector,
        limit: n,
        filter: { must: mustFilters }, // 💡 동적으로 생성된 필터 적용
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
          category: res.payload?.category_name, // 💡 결과 카테고리 확인용 추가
        })),
      };
    } catch (error) {
      console.error('❌ Search Error:', error);
      throw error;
    }
  }
}
