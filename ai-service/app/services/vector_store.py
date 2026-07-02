import os
from typing import Any

# chromadb and sentence-transformers are optional heavy dependencies
# (require C++ Build Tools on Windows to compile). We gracefully degrade
# to an in-memory stub so all other AI service endpoints still work.
try:
    import chromadb
    from sentence_transformers import SentenceTransformer

    COLLECTION_NAME = "candidates"
    _persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
    _client = chromadb.PersistentClient(path=_persist_dir)
    _collection = _client.get_or_create_collection(name=COLLECTION_NAME)
    _vector_available = True
except Exception as _e:
    print(f"[vector_store] chromadb/sentence-transformers unavailable ({_e}). Using in-memory stub.")
    _vector_available = False
    _collection = None

_model = None


def get_embedder():
    global _model
    if not _vector_available:
        return None
    if _model is None:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        _model = SentenceTransformer(model_name)
    return _model


def index_candidate(candidate_id: str, text: str, metadata: dict[str, Any]) -> dict:
    if not _vector_available:
        return {"candidate_id": candidate_id, "indexed": False, "reason": "vector store unavailable"}
    embedder = get_embedder()
    embedding = embedder.encode(text).tolist()
    _collection.upsert(
        ids=[candidate_id],
        embeddings=[embedding],
        documents=[text[:8000]],
        metadatas=[{k: str(v) for k, v in metadata.items()}],
    )
    return {"candidate_id": candidate_id, "indexed": True}


def search_candidates(query: str, filters: dict[str, Any], limit: int = 20) -> dict:
    if not _vector_available:
        return {"matches": [], "reason": "vector store unavailable — install chromadb and sentence-transformers"}
    embedder = get_embedder()
    embedding = embedder.encode(query).tolist()

    where = None
    if filters.get("language"):
        where = {"language": str(filters["language"])}

    results = _collection.query(
        query_embeddings=[embedding],
        n_results=min(limit, 50),
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    matches = []
    for i, cid in enumerate(results["ids"][0]):
        matches.append({
            "candidate_id": cid,
            "score": round(1 - results["distances"][0][i], 4),
            "snippet": (results["documents"][0][i] or "")[:300],
            "metadata": results["metadatas"][0][i],
        })

    return {"matches": matches}
