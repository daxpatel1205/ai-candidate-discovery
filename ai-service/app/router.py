from fastapi import APIRouter

from app.schemas import (
    CompareRequest,
    DetectLanguageRequest,
    FraudRequest,
    IndexRequest,
    InterviewRequest,
    RankRequest,
    ResumeParseRequest,
    SearchRequest,
    TranslateRequest,
)
from app.services.fraud_detector import analyze_fraud
from app.services.interview_generator import generate_interview_questions
from app.services.ranking import compare_candidates, rank_candidates
from app.services.resume_parser import extract_text, parse_structured
from app.services.translation import detect_language, translate_text
from app.services.vector_store import index_candidate, search_candidates

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@router.post("/parse/resume")
def parse_resume(req: ResumeParseRequest):
    raw_text = extract_text(req.file_path, req.mime_type)
    structured = parse_structured(raw_text)
    return {"raw_text": raw_text, "structured": structured}


@router.post("/search/index")
def search_index(req: IndexRequest):
    return index_candidate(req.candidate_id, req.text, req.metadata)


@router.post("/search/query")
def search_query(req: SearchRequest):
    return search_candidates(req.query, req.filters, req.limit)


@router.post("/rank")
def rank(req: RankRequest):
    return rank_candidates(req.job, req.candidates)


@router.post("/compare")
def compare(req: CompareRequest):
    return compare_candidates(req.job, req.candidates)


@router.post("/interview/generate")
def interview_generate(req: InterviewRequest):
    return generate_interview_questions(
        req.candidate,
        req.job,
        req.difficulty,
        req.count,
        req.categories,
        req.language,
    )


@router.post("/fraud/analyze")
def fraud_analyze(req: FraudRequest):
    return analyze_fraud(req.candidate_id, req.resume_text, req.structured)


@router.post("/i18n/detect")
def i18n_detect(req: DetectLanguageRequest):
    return detect_language(req.text)


@router.post("/i18n/translate")
def i18n_translate(req: TranslateRequest):
    return translate_text(req.text, req.target_language, req.source_language)
