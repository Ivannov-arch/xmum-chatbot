# ============================================================================
# chatbot/retriever.py
#
# Retriever - fetches answers from Supabase database based on:
#   1. Intent classification (module + sub_intent)
#   2. Entity extraction
#   3. Keyword/template matching
#
# Workflow:
#   1. Load knowledge base from Supabase
#   2. Score templates using keyword matching
#   3. Return best match with confidence score
# ============================================================================

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

from chatbot.preprocessor import build_augmented_query, build_search_terms, normalize
from chatbot.gemini_matcher import GeminiMatcher
from chatbot.embedder import GeminiEmbedder

# Load environment variables from .env
load_dotenv()


LOW_SIGNAL_QUERY_TERMS = {
    "available",
    "campus",
    "help",
    "information",
    "know",
    "malaysia",
    "need",
    "provide",
    "provided",
    "service",
    "services",
    "student",
    "students",
    "university",
    "want",
    "xiamen",
    "xmum",
}

LOCAL_KB_SOURCES = {"local", "json", "local_json", "seeds"}


def _get_kb_source() -> str:
    """Return the configured KB source, defaulting to Supabase."""
    source = os.getenv("CHATBOT_KB_SOURCE")
    if not source or not source.strip():
        return "supabase"
    return source.strip().lower()


@dataclass
class KnowledgeItem:
    """Represents a single Q&A entry from the knowledge base."""
    module: str
    question: str
    answer: str
    keywords: List[str]
    sub_intent: Optional[str] = None
    id: Optional[str] = None


class KnowledgeRetriever:
    """
    Loads and searches through the knowledge base.
    
    Attributes:
        knowledge_base: List of KnowledgeItem objects
        module_index: Dict mapping module names to items
    """
    
    def __init__(self):
        """
        Initialize retriever and load knowledge base.
        """
        self.supabase: Optional[Any] = None
        self.source = "unknown"
        self.knowledge_base: List[KnowledgeItem] = []
        self.module_index: Dict[str, List[KnowledgeItem]] = {}
        self.gemini_matcher = GeminiMatcher()
        self.embedder = GeminiEmbedder()

        source = _get_kb_source()
        if source in LOCAL_KB_SOURCES:
            self.source = "local"
            self._load_from_local_seeds()
            return

        try:
            self._connect_supabase()
            self.source = "supabase"
            self._load_from_supabase()
        except Exception as error:
            print(f"[Retriever]  Supabase unavailable, using local JSON seeds: {error}")
            self.source = "local"
            self._load_from_local_seeds()
    
    def _connect_supabase(self) -> None:
        """Connect to Supabase using credentials from .env"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file"
            )

        try:
            from supabase import create_client
        except Exception as error:
            raise ImportError(f"Could not import supabase client: {error}") from error
        
        self.supabase = create_client(supabase_url, supabase_key)
        print("[Retriever]  Connected to Supabase")

    def _add_row(self, row: dict) -> None:
        module = row.get('module', '').lower()
        keywords = row.get('keywords', [])

        # Handle keywords - could be list or comma-separated string
        if isinstance(keywords, str):
            keywords = [kw.strip().lower() for kw in keywords.split(',')]
        else:
            keywords = [str(kw).lower() for kw in keywords]

        item = KnowledgeItem(
            module=module,
            question=row.get('question', ''),
            answer=row.get('answer', ''),
            keywords=keywords,
            sub_intent=row.get('sub_intent'),
            id=row.get('id')
        )

        self.knowledge_base.append(item)
        self.module_index.setdefault(module, []).append(item)
    
    def _load_from_supabase(self) -> None:
        """Load knowledge base from Supabase database."""
        try:
            # Fetch all rows from knowledge_items table
            response = self.supabase.table("knowledge_items").select("*").execute()
            
            data = response.data
            print(f"[Retriever]  Loaded {len(data)} items from Supabase")
            
            for row in data:
                self._add_row(row)
        
        except Exception as e:
            print(f"[Retriever]  Error loading from Supabase: {e}")
            raise

    def _load_from_local_seeds(self) -> None:
        """Load knowledge base from local JSON seeds for offline development."""
        seeds_dir = Path(__file__).resolve().parent.parent / "database" / "seeds"
        for module in ["general", "admin_directory", "campus_life", "academic_navigation"]:
            path = seeds_dir / f"{module}.json"
            if not path.exists():
                continue
            with path.open(encoding="utf-8") as file:
                rows = json.load(file)
            for row in rows:
                self._add_row(row)

        print(f"[Retriever]  Loaded {len(self.knowledge_base)} items from local JSON seeds")


    def _retrieve_by_vector(
        self,
        user_message: str,
        filter_module: Optional[str] = None,
        top_k = 5
    ) -> List[Tuple[KnowledgeItem, float]]:
        """
        Semantic vector search via Supabase pgvector.
        Returns list of (KnowledgeItem, similarity_score) sorted by score desc.
        Returns empty list if embedder or Supabase is unavailable.
        """
        if not self.embedder.is_available() or self.supabase is None:
            return []
        
        embedding = self.embedder.embed_text(user_message)
        if embedding is None:
            return []

        try:
            params = {
                "query_embedding": embedding,
                "match_threshold": 0.3,
                "match_count": top_k
            }
            if filter_module:
                params["filter_module"] = filter_module
            
            response = self.supabase.rpc("match_documents", params).execute()
            rows = response.data or []

            results = []
            for row in rows:
                item = KnowledgeItem(
                    module=row['module'],
                    question=row['question'],
                    answer=row['answer'],
                    keywords=row.get('keywords', []),
                    sub_intent=row.get('sub_intent'),
                    id=row.get('id')
                )
                results.append((item, float(row["similarity"])))

            return results

        except Exception as e:
            print(f"[Retriever] Error in _retrieve_by_vector: {e}")
            return []
            
    
    def retrieve(
        self,
        module: str,
        user_message: str,
        extracted_entities: Optional[Dict[str, List[str]]] = None,
        sub_intent: Optional[str] = None,
    ) -> Tuple[Optional[KnowledgeItem], float, List[Tuple[KnowledgeItem, float]]]:
        """
        Retrieve the best matching answer for a user query.
        
        Args:
            module: The classified module (from intent_classifier)
            user_message: The raw user input
            extracted_entities: Optional entities extracted by entity_recognizer
            sub_intent: Optional fine-grained category from intent_classifier
        
        Returns:
            A tuple of:
            - best_item: The top matching KnowledgeItem (or None)
            - best_score: Confidence score of the best match
            - all_scores: List of (item, score) sorted by score descending
        """
        candidates = self.module_index.get(module, [])
        if not candidates:
            return None, 0.0, []

        # ── Primary path: pgvector semantic search ──────────────────
        vector_results = self._retrieve_by_vector(user_message, filter_module=module)
        if vector_results:
            best_item, best_score = vector_results[0]
            # Scale similarity (0-1) to confidence score (0-10)
            best_score_scaled = best_score * 10.0
            scores = [(item, s * 10.0) for item, s in vector_results]
            print(f"[Retriever] Vector search: top match '{best_item.question[:50]}' ({best_score:.3f})")
            return best_item, best_score_scaled, scores

        # ── Fallback 1: Gemini semantic matching (if no embeddings yet) ──
        if self.gemini_matcher.is_available():
            try:
                candidate_questions = [item.question for item in candidates]
                matched_idx, confidence, reasoning = self.gemini_matcher.match_question(
                    user_message, candidate_questions
                )
                if matched_idx != -1 and confidence >= 0.5:
                    best_item = candidates[matched_idx]
                    best_score = confidence * 10.0
                    scores = []
                    for idx, item in enumerate(candidates):
                        if idx == matched_idx:
                            scores.append((item, best_score))
                        else:
                            scores.append((item, 0.0))
                    return best_item, best_score, scores
            except Exception as e:
                print(f"[Retriever] Gemini matching failed, falling back: {e}")

        # ── Fallback 2: keyword scoring ──────────────────────────────
        scores = []
        for item in candidates:
            score = self._score_item(user_message, item, extracted_entities)
            if sub_intent and sub_intent != "unknown" and item.sub_intent == sub_intent:
                score += 1.0
            scores.append((item, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        best_item = scores[0][0] if scores else None
        best_score = scores[0][1] if scores else 0.0
        return best_item, best_score, scores

    def _meaningful_terms(self, text: str) -> set[str]:
        """Return search terms that are useful for ranking a knowledge item."""
        return {
            term for term in build_search_terms(text)
            if len(term) >= 3 and term not in LOW_SIGNAL_QUERY_TERMS
        }
    
    def _score_item(
        self,
        user_message: str,
        item: KnowledgeItem,
        extracted_entities: Optional[Dict[str, List[str]]] = None
    ) -> float:
        """
        Score a knowledge item against the user message.
        
        Scoring strategy:
        1. Exact keyword matches in user message (+2 points each)
        2. Partial keyword matches (+1 point each)
        3. Entity matches from entity_recognizer (+3 points each)
        
        Args:
            user_message: The raw user input
            item: The KnowledgeItem to score
            extracted_entities: Extracted entities from entity_recognizer
        
        Returns:
            A numeric score (higher = better match)
        """
        score = 0.0
        message_lower = build_augmented_query(user_message)
        query_terms = self._meaningful_terms(user_message)
        keyword_terms = self._meaningful_terms(" ".join(item.keywords))
        question_terms = self._meaningful_terms(item.question)
        answer_terms = self._meaningful_terms(item.answer)
        
        # Strategy 1: Exact and partial keyword matches
        for keyword in item.keywords:
            keyword_lower = normalize(keyword)
            if not keyword_lower:
                continue

            # Exact match (higher weight)
            if self._is_whole_word_match(keyword_lower, message_lower):
                token_count = len(keyword_lower.split())
                score += 3.0 + (0.5 * max(token_count - 1, 0))

            # Partial match (lower weight)
            elif any(
                self._is_whole_word_match(term, keyword_lower)
                for term in query_terms
            ):
                score += 1.0

        # Strategy 2: Boost when meaningful query terms appear in the question.
        # This breaks ties between broad keywords like "wifi" and more specific
        # questions such as "How can students connect to the campus Wi-Fi?"
        question_lower = normalize(item.question)
        for term in query_terms:
            if term in keyword_terms:
                score += 1.5
            if self._is_whole_word_match(term, question_lower):
                score += 1.5

            if term in answer_terms:
                score += 0.5

        # Strategy 3: Reward items that cover multiple meaningful terms from a
        # long sentence instead of overvaluing a single early keyword.
        item_terms = question_terms | keyword_terms | answer_terms
        if query_terms:
            overlap = query_terms & item_terms
            coverage = len(overlap) / len(query_terms)
            score += min(len(overlap), 5) * 0.4
            score += coverage * 3.0
        
        # Strategy 4: Entity-based scoring
        item_match_text = normalize(f"{item.question} {' '.join(item.keywords)}")
        if extracted_entities:
            # Give extra weight to entity matches
            for entity_type, entities in extracted_entities.items():
                if entity_type in ["pos_nouns"]:
                    # Proper nouns are less reliable, lower weight
                    for entity in entities:
                        for entity_term in build_search_terms(entity) or [normalize(entity)]:
                            if entity_term and self._is_whole_word_match(entity_term, item_match_text):
                                score += 1.5
                                break
                else:
                    # Standard entities (facility, office, academic, etc.)
                    for entity in entities:
                        for entity_term in build_search_terms(entity) or [normalize(entity)]:
                            if entity_term and self._is_whole_word_match(entity_term, item_match_text):
                                score += 3.0
                                break
        
        return score
    
    def _is_whole_word_match(self, word: str, text: str) -> bool:
        """Check if a word appears as a whole word in text."""
        import re
        pattern = r'\b' + re.escape(word) + r'\b'
        return bool(re.search(pattern, text))
    
    def retrieve_all_for_module(self, module: str) -> List[KnowledgeItem]:
        """Get all items for a specific module (for fallback/suggestions)."""
        return self.module_index.get(module, [])

    def retrieve_across_modules(
        self,
        user_message: str,
        extracted_entities: Optional[Dict[str, List[str]]] = None,
    ) -> Tuple[Optional[KnowledgeItem], float, List[Tuple[KnowledgeItem, float]]]:
        """Retrieve the best item without relying on intent classification."""

        # ── Primary path: pgvector semantic search (no module filter) ──
        vector_results = self._retrieve_by_vector(user_message, top_k=5)
        if vector_results:
            best_item, best_score = vector_results[0]
            best_score_scaled = best_score * 10.0
            scores = [(item, s * 10.0) for item, s in vector_results]
            print(f"[Retriever] Global vector search: '{best_item.question[:50]}' ({best_score:.3f})")
            return best_item, best_score_scaled, scores

        # ── Fallback 1: Gemini semantic matching ──────────────────────
        if self.gemini_matcher.is_available():
            try:
                candidates = [item for item in self.knowledge_base if item.module != "general"]
                candidate_questions = [item.question for item in candidates]
                matched_idx, confidence, reasoning = self.gemini_matcher.match_question(
                    user_message, candidate_questions
                )
                if matched_idx != -1 and confidence >= 0.5:
                    best_item = candidates[matched_idx]
                    best_score = confidence * 10.0
                    scores = []
                    for idx, item in enumerate(candidates):
                        if idx == matched_idx:
                            scores.append((item, best_score))
                        else:
                            scores.append((item, 0.0))
                    return best_item, best_score, scores
            except Exception as e:
                print(f"[Retriever] Gemini global matching failed, falling back: {e}")

        # ── Fallback 2: keyword scoring ───────────────────────────────
        scores = [
            (item, self._score_item(user_message, item, extracted_entities))
            for item in self.knowledge_base
            if item.module != "general"
        ]
        scores.sort(key=lambda x: x[1], reverse=True)
        best_item = scores[0][0] if scores else None
        best_score = scores[0][1] if scores else 0.0
        return best_item, best_score, scores

    def search(self, module: str, query: str, top_k: int = 5) -> list[dict]:
        """Backward-compatible search API used by older tests."""
        _, _, scores = self.retrieve(module=module, user_message=query)
        results = []
        for item, score in scores:
            if score <= 0:
                continue
            results.append({
                "module": item.module,
                "sub_intent": item.sub_intent,
                "question": item.question,
                "answer": item.answer,
                "keywords": item.keywords,
                "score": score,
            })
            if len(results) >= top_k:
                break
        return results


Retriever = KnowledgeRetriever


# ============================================================================
# TEST BLOCK
# ============================================================================

if __name__ == "__main__":
    try:
        # Initialize retriever (loads from Supabase)
        retriever = KnowledgeRetriever()
        print(f"[Test]  Loaded {len(retriever.knowledge_base)} items from Supabase\n")
        
        # Test queries
        test_queries = [
            ("library", "campus_life"),
            ("makerspace", "campus_life"),
        ]
        
        for query, module in test_queries:
            print(f"Query: '{query}' (Module: {module})")
            best, score, all_scores = retriever.retrieve(module, query)
            
            if best:
                print(f" Best match: {best.question}")
                print(f"  Score: {score:.1f}")
                print(f"  Answer: {best.answer[:100]}...")
            else:
                print("✗ No match found")
            print()
    
    except Exception as e:
        print(f"Error during test: {e}")
        print("Make sure .env file exists with SUPABASE_URL and SUPABASE_ANON_KEY")
