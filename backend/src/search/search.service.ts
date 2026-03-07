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
}
