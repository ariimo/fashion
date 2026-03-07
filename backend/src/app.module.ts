import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './search/search.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    ServeStaticModule.forRoot({
      // 부모 폴더의 images/val2020 경로를 잡습니다.
      rootPath: join(process.cwd(), '../..', 'images', 'test'),
      serveRoot: '/static-images',
    }),
    SearchModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
