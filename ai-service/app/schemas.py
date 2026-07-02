from pydantic import BaseModel, Field
from typing import Any


class ResumeParseRequest(BaseModel):
    file_path: str
    mime_type: str | None = None


class IndexRequest(BaseModel):
    candidate_id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str
    filters: dict[str, Any] = Field(default_factory=dict)
    limit: int = 20


class RankRequest(BaseModel):
    job: dict[str, Any]
    candidates: list[dict[str, Any]]


class CompareRequest(BaseModel):
    job: dict[str, Any] | None = None
    candidates: list[dict[str, Any]]


class InterviewRequest(BaseModel):
    candidate: dict[str, Any]
    job: dict[str, Any] | None = None
    difficulty: str = "medium"
    count: int = 10
    categories: list[str] = Field(default_factory=lambda: ["technical", "behavioral", "situational"])
    language: str = "en"


class FraudRequest(BaseModel):
    candidate_id: str
    resume_text: str
    structured: dict[str, Any] = Field(default_factory=dict)


class DetectLanguageRequest(BaseModel):
    text: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: str | None = None
