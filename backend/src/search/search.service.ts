import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

      // 💡 명세서 확장을 위해 next_page_offset도 같이 보내주면 좋습니다. (프론트엔드 무한스크롤용)
      return {
        images,
        next_offset: response.next_page_offset,
      };
    } catch (error) {
      console.error('❌ Qdrant Scroll Error:', error);
      throw error;
    }
  }

  async searchSimilarItems(imageId: number, annId?: number, n = 100) {
    try {
      // 1. 기준이 되는 아이템의 벡터(Query Vector)를 찾습니다.
      const targetResponse = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: {
          must: [
            { key: 'image_id', match: { value: imageId } },
            // annId가 있으면 해당 옷, 없으면 이미지 전체(is_global: true)를 기준으로 삼음
            annId
              ? { key: 'ann_id', match: { value: annId } }
              : { key: 'is_global', match: { value: true } },
          ],
        },
        limit: 1,
        with_vector: true,
      });

      if (targetResponse.points.length === 0) {
        throw new Error('기준 아이템을 찾을 수 없습니다.');
      }

      const targetPoint = targetResponse.points[0];
      const targetVector = targetPoint.vector as number[];

      // 2. 해당 이미지의 모든 어노테이션(옷들) 정보를 가져옵니다 (명세서의 target.annotations 용)
      const allAnnotations = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: {
          must: [
            { key: 'image_id', match: { value: imageId } },
            { key: 'is_global', match: { value: false } }, // 옷 정보만 가져옴
          ],
        },
        with_payload: true,
      });

      // 3. Qdrant 벡터 검색 수행
      const searchResults = await this.qdrantClient.search('fashionpedia_v1', {
        vector: targetVector,
        limit: n,
        filter: {
          must: [{ key: 'is_global', match: { value: false } }], // 결과에서는 원본 이미지는 제외하고 '옷'들만 보여줌
        },
        with_payload: true,
      });

      const baseUrl = 'http://localhost:3000/static-images';

      // 4. 명세서 v1 규격에 맞게 리턴
      return {
        target: {
          image_id: imageId,
          url: `${baseUrl}/${targetPoint.payload?.url}`,
          annotations: allAnnotations.points.map((p) => ({
            id: p.payload?.ann_id,
            category: p.payload?.category_name, // 인덱싱할 때 넣은 카테고리명
            bbox: p.payload?.bbox, // [x, y, w, h]
            // segmentation은 데이터 용량이 크므로 필요시 추가
          })),
        },
        results: searchResults.map((res) => ({
          image_id: res.payload?.image_id,
          ann_id: res.payload?.ann_id,
          url: `${baseUrl}/${res.payload?.url}`,
          score: res.score, // 유사도 점수 (1.0에 가까울수록 닮음)
        })),
      };
    } catch (error) {
      console.error('❌ Search Error:', error);
      throw error;
    }
  }
}
