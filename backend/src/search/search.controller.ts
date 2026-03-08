import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller() // main.ts에서 global prefix를 설정했으므로 비워둡니다.
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('homepage')
  async getHomepage(
    @Query('n', new ParseIntPipe({ optional: true })) n?: number,
    @Query('offset') offset?: string,
  ) {
    const limit = n || 100;
    return this.searchService.getHomepageFeed(limit, offset);
  }

  @Get('search')
  async search(
    @Query('i', ParseIntPipe) imageId: number,
    @Query('a') annId?: string,
    @Query('n', new ParseIntPipe({ optional: true })) n?: number,
  ) {
    return this.searchService.searchSimilarItems(imageId, annId, n || 100);
  }
}
