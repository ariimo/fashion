# Fashionpedia: Intelligent Clothing Search 👗🔍

Welcome to the **Fashionpedia Intelligent Clothing Search** project. This repository contains the complete implementation of a cutting-edge fashion discovery platform designed to help users find and explore clothing items based on visual similarity and specific garment features.

This project successfully fulfills all mandatory functional requirements as defined in the initial assignment.

---

## 🚀 Project Overview & Completed Requirements

This system provides a seamless, Pinterest-inspired user experience for exploring fashion items. Below is the confirmation of all implemented core features:

### 1. Garment Highlight Animation (Frontend)
- **Status:** ✅ **Completed**
- **Details:** The frontend features an interactive, intuitive image viewer. When viewing a specific fashion look, users can hover over individual garments (e.g., shirts, pants, skirts). These items are dynamically highlighted using segmentation masks directly extracted from the dataset.
- **Experience:** The application utilizes a custom `"scan-to-bright"` CSS animation (defined in `globals.css` and applied via `.fashion-polygon`). Hovering over a segment illuminates it, and clicking it locks the selection, instantly triggering a targeted search for that specific garment.

### 2. Fluid Rendering & Masonry Layout (Frontend)
- **Status:** ✅ **Completed**
- **Details:** To handle the vast collection of fashion images elegantly, the application employs a highly responsive CSS multi-column Masonry layout (`columns-3xs`, `columns-2` with `break-inside-avoid`).
- **Performance:** The feed fluidly adapts to different screen sizes. More importantly, it supports smooth, infinite scrolling powered by the modern `IntersectionObserver` API. This ensures optimal rendering and performance even when browsing through 1,000+ images, similar to the experience on platforms like `same.energy`.

### 3. Navigation Flow (Frontend & Browser Native)
- **Status:** ✅ **Completed**
- **Details:** The application deeply integrates with Next.js routing to ensure a robust, native browsing experience.
- **Experience:** Every search action and item selection updates the URL with specific query parameters (e.g., `?i=[image_id]&a=[annotation_id]`). This means every search result has a unique, shareable URL. Users can freely use the browser's native **Forward** and **Back** buttons to navigate through their search history without losing their context or place in the feed.

### 4. Vector Search API (Backend & DB)
- **Status:** ✅ **Completed**
- **Details:** The backend is powered by NestJS and leverages a state-of-the-art AI stack for intelligent retrieval.
- **Technology:**
  - **Database:** Uses **Qdrant** as a high-performance Vector Database.
  - **Embeddings:** Integrates **Google's `gemini-embedding-001`** model via the Generative AI API to convert descriptive garment attributes into high-dimensional vectors.
  - **Logic:** The backend intelligently filters searches. It can search for an entire "global" look or isolate a specific local garment category (filtering out minor details like buttons or zippers to focus on core clothing items).

### 5. Dataset Integration
- **Status:** ✅ **Completed**
- **Details:** The entire system is built upon the robust **Fashionpedia** dataset (`instances_attributes_val2020.json`). The custom Python script (`index_data.py`) processes this dataset, extracting rich annotations, bounding boxes, segmentation masks, and descriptive attributes, converting them into optimized embeddings for Qdrant.

---

## 🧠 Other Considerations: UX for Finding Unique Clothes

Building a tool for fashion discovery requires more than just accurate search; it demands a user experience that encourages exploration and serendipity.

When designing the flow for finding unique clothes, the following considerations were paramount:

1. **Visual-First Interaction:** Fashion is inherently visual. By utilizing precise segmentation masks rather than simple bounding boxes, users interact directly with the *shape* of the garment. This tactile feel makes the discovery process feel more natural and less like interacting with a database.
2. **Contextual Discovery:** Users rarely search for a "red shirt" in a vacuum. They see a red shirt as part of an outfit. The system is designed to show the *target* item alongside its *context* (the full look), allowing users to understand how a piece might be styled before diving into similar items.
3. **Frictionless Exploration:** The combination of infinite scrolling and instant URL updates removes friction. Users can fall down a "rabbit hole" of similar items, clicking from one unique piece to another, knowing they can easily hit the "Back" button to return to a previous branching path.
4. **Graceful Handling of Edge Cases:** The backend specifically filters out hyper-specific garment parts (like 'lapel' or 'zipper') from the main search flow. This prevents the user from accidentally searching for similar zippers when they actually want a similar jacket, significantly improving the relevance of recommendations for unique, entire clothing pieces.

---

## 🛠️ Tech Stack Summary

- **Frontend:** Next.js (React), Tailwind CSS, Framer Motion (Playwright for verification)
- **Backend:** NestJS (Node.js/TypeScript)
- **Database:** Qdrant (Vector DB)
- **AI/ML:** Google Generative AI (`gemini-embedding-001`)
- **Data Processing:** Python (Pillow, NumPy)

*This project represents a complete, functional prototype ready for further refinement and deployment.*