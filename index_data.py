import json
import os
import uuid
import time
import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# 1. 환경 설정 및 클라이언트 초기화
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai_client = genai.Client(api_key=GEMINI_API_KEY)

BASE_PATH = ".."
JSON_PATH = os.path.join(BASE_PATH, "annotations/instances_attributes_val2020.json")
IMAGE_DIR = os.path.join(BASE_PATH, "images/val2020")
COLLECTION_NAME = "fashionpedia_v1"
VECTOR_SIZE = 768
BATCH_SIZE_LIMIT = 100  # 한 번의 API 호출에 담을 최대 텍스트 개수

qdrant_client = QdrantClient(url="http://localhost:6333")

if not qdrant_client.collection_exists(COLLECTION_NAME):
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )

def get_normed_embeddings_batch(texts):
    """최신 SDK를 이용한 배치 임베딩 및 정규화"""
    if not texts: return []
    
    # 429 에러 대응을 위한 자체 Retry 로직
    max_retries = 5
    for attempt in range(max_retries):
        try:
            result = genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=VECTOR_SIZE
                )
            )
            
            normed_vectors = []
            for emb in result.embeddings:
                vec_np = np.array(emb.values)
                norm = np.linalg.norm(vec_np)
                normed_vectors.append((vec_np / norm if norm > 0 else vec_np).tolist())
            return normed_vectors
            
        except Exception as e:
            if "429" in str(e):
                wait = 31
                print(f"⏳ Quota hit in Super-Batch! Waiting {wait}s...")
                time.sleep(wait)
            else:
                raise e
    return []

# 2. 데이터 로드
with open(JSON_PATH, 'r') as f:
    data = json.load(f)

category_map = {c['id']: c['name'] for c in data['categories']}
attribute_map = {a['id']: a['name'] for a in data['attributes']}
annotations = data['annotations']
sample_images = data['images'][:1000]

print(f"🚀 Super-Batch Indexing started for {len(sample_images)} images...")

# --- 슈퍼 배치를 위한 버퍼 ---
text_buffer = []    # API로 보낼 텍스트 리스트
meta_buffer = []    # 나중에 벡터와 매칭할 메타데이터 리스트
points_to_upsert = [] # Qdrant에 넣을 포인트 리스트

def process_buffer():
    """버퍼에 쌓인 텍스트를 100개씩 쪼개서 임베딩하고 Qdrant에 적재"""
    global text_buffer, meta_buffer, points_to_upsert
    if not text_buffer: return

    # API 제한(100개)에 맞춰 100개씩 슬라이싱해서 처리
    for i in range(0, len(text_buffer), 100):
        chunk_texts = text_buffer[i : i + 100]
        chunk_metas = meta_buffer[i : i + 100]
        
        print(f"📡 Processing chunk of {len(chunk_texts)} items...")
        vectors = get_normed_embeddings_batch(chunk_texts)

        for meta, vec in zip(chunk_metas, vectors):
            points_to_upsert.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload=meta
            ))
    
    # Qdrant에 벌크 적재
    if points_to_upsert:
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points_to_upsert)
    
    # 전체 버퍼 비우기
    text_buffer, meta_buffer, points_to_upsert = [], [], []

# 3. 메인 루프
for i, img_info in enumerate(sample_images):
    img_id, file_name = img_info['id'], img_info['file_name']
    img_annots = [a for a in annotations if a['image_id'] == img_id]
    
    # (1) Global Text 생성 및 버퍼 추가
    all_cats = list(set([category_map.get(a['category_id'], "") for a in img_annots]))
    global_desc = f"A fashion look containing {', '.join(all_cats)}"
    text_buffer.append(global_desc)
    meta_buffer.append({
        "image_id": img_id, "url": file_name, "is_global": True, "description": global_desc
    })

    # (2) Local Texts 생성 및 버퍼 추가
    for annot in img_annots:
        cat_name = category_map.get(annot['category_id'], "item")
        attrs = [attribute_map.get(aid, "") for aid in annot.get('attribute_ids', [])]
        local_desc = f"{', '.join(attrs)} {cat_name}".strip()
        
        text_buffer.append(local_desc)
        meta_buffer.append({
            "image_id": img_id, "is_global": False, "annotation_id": annot['id'],
            "category_name": cat_name, "description": local_desc,
            "segmentation": annot['segmentation'], "bbox": annot['bbox'], "url": file_name
        })

    # (3) 버퍼가 임계치(200개)를 넘으면 API 호출
    if len(text_buffer) >= BATCH_SIZE_LIMIT:
        process_buffer()
        print(f"📊 Progress: {i+1}/{len(sample_images)} images handled.")
        time.sleep(1) # API 안정성을 위한 짧은 휴식

# 남은 데이터 처리
process_buffer()

print("\n✨ Super-Batch Indexing Complete!")