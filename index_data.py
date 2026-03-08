import json
import os
import uuid
import time
import numpy as np
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# --- 1. 설정 및 필터 리스트 ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai_client = genai.Client(api_key=GEMINI_API_KEY)

EXCLUDED_PARTS = [
    'hood', 'collar', 'lapel', 'epaulette', 'sleeve', 'pocket', 'neckline',
    'buckle', 'zipper', 'applique', 'bead', 'bow', 'flower', 
    'fringe', 'ribbon', 'rivet', 'ruffle', 'sequin', 'tassel'
]

BASE_PATH = ".."
IMAGE_DIR = os.path.join(BASE_PATH, "images/test")
JSON_PATH = os.path.join(BASE_PATH, "annotations/instances_attributes_val2020.json")
COLLECTION_NAME = "fashionpedia_v1"
VECTOR_SIZE = 768
BATCH_SIZE_LIMIT = 100 

qdrant_client = QdrantClient(url="http://localhost:6333")

if not qdrant_client.collection_exists(COLLECTION_NAME):
    print(f"🏗️ Creating collection: {COLLECTION_NAME}")
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )

# --- 2. 임베딩 함수 (30초 대기 + 3회 재시도 로직) ---
def get_normed_embeddings_batch(texts):
    if not texts: return []
    
    max_retries = 3
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
            # 💡 429 에러(Quota Exceeded) 시 30초 대기 후 재시도
            if "429" in str(e):
                print(f"⏳ Quota hit! Waiting 30s before retry {attempt + 1}/{max_retries}...")
                time.sleep(30)
                continue
            else:
                print(f"❌ Unexpected API Error: {e}")
                break # 429 외의 에러는 해당 배치 포기
                
    return [] # 3번 모두 실패 시 빈 리스트 반환

# --- 3. 데이터 로드 ---
with open(JSON_PATH, 'r') as f:
    data = json.load(f)

category_map = {c['id']: c['name'] for c in data['categories']}
attribute_map = {a['id']: a['name'] for a in data['attributes']}
annotations = data['annotations']
sample_images = data['images'][:2000] 

text_buffer, meta_buffer = [], []

def flush_buffer():
    global text_buffer, meta_buffer
    if not text_buffer: return
    
    for i in range(0, len(text_buffer), BATCH_SIZE_LIMIT):
        chunk_texts = text_buffer[i : i + BATCH_SIZE_LIMIT]
        chunk_metas = meta_buffer[i : i + BATCH_SIZE_LIMIT]
        
        vectors = get_normed_embeddings_batch(chunk_texts)
        if not vectors:
            print(f"🚫 Skipping chunk of {len(chunk_texts)} items after failed retries.")
            continue

        points = [
            PointStruct(id=str(uuid.uuid4()), vector=v, payload=m)
            for v, m in zip(vectors, chunk_metas)
        ]
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"✅ Upserted {len(points)} points.")
        # 💡 API 간의 여유를 위해 짧은 휴식
        time.sleep(1)
    
    text_buffer, meta_buffer = [], []

# --- 4. 메인 인덱싱 루프 ---
print(f"🚀 Starting Optimized Indexing for {len(sample_images)} images...")

for i, img_info in enumerate(sample_images):
    img_id, file_name = img_info['id'], img_info['file_name']
    img_path = os.path.join(IMAGE_DIR, file_name)

    try:
        with Image.open(img_path) as img:
            w, h = img.size
        
        img_annots = [a for a in annotations if a['image_id'] == img_id]
        
        all_cats = list(set([category_map.get(a['category_id'], "") for a in img_annots]))
        global_desc = f"A fashion look containing {', '.join(all_cats)}"
        text_buffer.append(global_desc)
        meta_buffer.append({
            "image_id": img_id, "url": file_name, "is_global": True,
            "width": w, "height": h, "description": global_desc
        })

        for annot in img_annots:
            cat_name = category_map.get(annot['category_id'], "item")
            if any(part in cat_name.lower() for part in EXCLUDED_PARTS):
                continue
                
            attrs = [attribute_map.get(aid, "") for aid in annot.get('attribute_ids', [])]
            local_desc = f"{', '.join(attrs)} {cat_name}".strip()
            
            text_buffer.append(local_desc)
            meta_buffer.append({
                "image_id": img_id, "is_global": False, "category_name": cat_name,
                "width": w, "height": h, "url": file_name, "description": local_desc,
                "bbox": annot['bbox'], "segmentation": annot['segmentation']
            })

        if len(text_buffer) >= 400:
            flush_buffer()
            print(f"📊 Progress: {i+1}/{len(sample_images)} images handled.")

    except Exception as e:
        print(f"❌ Skipping image {img_id} due to file error: {e}")
        continue

flush_buffer()
print("\n✨ High-Efficiency Indexing Complete!")