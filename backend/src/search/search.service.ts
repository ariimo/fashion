import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  normalizeLimit,
  normalizeOffset,
  buildSearchFilters,
  formatHomepageResponse,
  formatSearchSimilarResponse,
} from './utils/search.utils';

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
      const limit = normalizeLimit(n);
      const scrollOffset = normalizeOffset(offset);

      const response = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: { must: [{ key: 'is_global', match: { value: true } }] },
        limit: limit,
        offset: scrollOffset,
        with_payload: true,
      });

      return formatHomepageResponse(response);
    } catch (error) {
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
    try {
      let targetPoint = await this.getTargetPoint(imageId, annId);
      if (!targetPoint) throw new Error('기준 아이템을 찾을 수 없습니다.');

      const targetVector = targetPoint.vector as number[];
      const isGlobalSource = targetPoint.payload?.is_global as boolean;
      const categoryName = targetPoint.payload?.category_name as string;

      const filters = buildSearchFilters(isGlobalSource, categoryName, targetPoint.id);

      const searchResults = await this.qdrantClient.search('fashionpedia_v1', {
        vector: targetVector,
        limit: n,
        offset: offset,
        filter: filters,
        with_payload: true,
      });

      const annotationsResponse = await this.qdrantClient.scroll('fashionpedia_v1', {
        filter: {
          must: [
            { key: 'image_id', match: { value: imageId } },
            { key: 'is_global', match: { value: false } },
          ],
        },
        with_payload: true,
      });

      return formatSearchSimilarResponse(
        imageId,
        targetPoint,
        annotationsResponse.points,
        searchResults,
        n,
        offset,
      );
    } catch (error) {
      console.error('❌ Search Error:', error);
      throw error;
    }
  }

  private async getTargetPoint(imageId: number, annId?: string | number) {
    if (annId && annId !== 'undefined') {
      const pointResult = await this.qdrantClient.retrieve(
        'fashionpedia_v1',
        {
          ids: [annId as string],
          with_vector: true,
          with_payload: true,
        },
      );
      if (pointResult.length > 0) return pointResult[0];
    }

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
    return targetResponse.points[0];
  }
}
