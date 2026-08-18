import pytest
from unittest.mock import AsyncMock, patch
import httpx
import openai
from app.embeddings.engine import preprocess_text, embed_texts, EMBEDDING_DIM
from app.config import settings

def test_preprocess_strips_whitespace():
    assert preprocess_text("  hello   world  \n\n\n  ") == "hello world"

def test_preprocess_truncates_long_text():
    text = "a" * 9000
    assert len(preprocess_text(text)) == 8000

@pytest.mark.asyncio
@patch("app.embeddings.engine.client")
async def test_embed_texts_single_batch(mock_client):
    class FakeEmbedding:
        def __init__(self):
            self.embedding = [0.1] * EMBEDDING_DIM
    
    class FakeResponse:
        def __init__(self):
            self.data = [FakeEmbedding(), FakeEmbedding(), FakeEmbedding()]

    mock_client.embeddings.create = AsyncMock(return_value=FakeResponse())
    
    results = await embed_texts(["a", "b", "c"])
    assert len(results) == 3
    for v in results:
        assert len(v) == EMBEDDING_DIM

@pytest.mark.asyncio
@patch("app.embeddings.engine.client")
async def test_embed_texts_multiple_batches(mock_client):
    original_batch_size = settings.EMBEDDING_BATCH_SIZE
    settings.EMBEDDING_BATCH_SIZE = 2
    
    try:
        class FakeEmbedding:
            def __init__(self):
                self.embedding = [0.1] * EMBEDDING_DIM
        
        class FakeResponse:
            def __init__(self):
                self.data = [FakeEmbedding(), FakeEmbedding()]
                
        class FakeData1Response:
            def __init__(self):
                self.data = [FakeEmbedding()]

        def side_effect(*args, **kwargs):
            input_data = kwargs.get("input", [])
            if len(input_data) == 2:
                return FakeResponse()
            return FakeData1Response()

        mock_client.embeddings.create = AsyncMock(side_effect=side_effect)
        
        results = await embed_texts(["a", "b", "c", "d", "e"])
        assert len(results) == 5
        assert mock_client.embeddings.create.call_count == 3
    finally:
        settings.EMBEDDING_BATCH_SIZE = original_batch_size

@pytest.mark.asyncio
@patch("app.embeddings.engine.client")
async def test_embed_texts_rate_limit_retry(mock_client):
    class FakeEmbedding:
        def __init__(self):
            self.embedding = [0.1] * EMBEDDING_DIM
            
    class FakeResponse:
        def __init__(self):
            self.data = [FakeEmbedding()]

    fake_request = httpx.Request("POST", "http://test")
    fake_response = httpx.Response(429, request=fake_request)

    mock_client.embeddings.create = AsyncMock(
        side_effect=[openai.RateLimitError("Limit", response=fake_response, body=None), 
                     openai.RateLimitError("Limit", response=fake_response, body=None), 
                     FakeResponse()]
    )
    
    results = await embed_texts(["a"])
    assert len(results) == 1
    assert mock_client.embeddings.create.call_count == 3

@pytest.mark.asyncio
@patch("app.embeddings.engine.client")
async def test_embed_texts_rate_limit_exhausted(mock_client):
    fake_request = httpx.Request("POST", "http://test")
    fake_response = httpx.Response(429, request=fake_request)
    mock_client.embeddings.create = AsyncMock(
        side_effect=openai.RateLimitError("Limit", response=fake_response, body=None)
    )
    
    with pytest.raises(openai.RateLimitError):
        await embed_texts(["a"])
    assert mock_client.embeddings.create.call_count == 3
