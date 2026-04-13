import asyncio
import re
import openai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from app.config import settings
from app.core.logging import get_logger
from app.models.submission import Submission

logger = get_logger(__name__)

client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
EMBEDDING_DIM = 1536

def preprocess_text(text: str) -> str:
    """Preprocess text before embedding."""
    logger.debug(f"Preprocessing text of length {len(text)}")
    text = text.strip()
    text = re.sub(r'\n{2,}', '\n', text)
    text = re.sub(r' {2,}', ' ', text)
    if len(text) > 8000:
        text = text[:8000]
    return text

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed texts using OpenAI."""
    logger.info(f"Embedding {len(texts)} texts in batches of {settings.EMBEDDING_BATCH_SIZE}")
    results = []
    
    batch_size = settings.EMBEDDING_BATCH_SIZE
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    
    for idx, batch in enumerate(batches):
        logger.debug(f"Process embedding batch {idx + 1}/{len(batches)}")
        retries = 3
        backoff = 2
        for attempt in range(retries):
            try:
                response = await client.embeddings.create(
                    model=settings.EMBEDDING_MODEL,
                    input=batch,
                    encoding_format="float"
                )
                results.extend([item.embedding for item in response.data])
                break
            except openai.RateLimitError as e:
                if attempt == retries - 1:
                    logger.error(f"RateLimitError max retries exceeded on batch {idx + 1}")
                    raise e
                logger.warning(f"Rate limit exceeded, retrying in {backoff}s...")
                await asyncio.sleep(backoff)
                backoff *= 2
            except Exception as e:
                logger.error(f"Error embedding batch {idx + 1}: {str(e)}")
                raise e
        
        if len(batches) > 1 and idx < len(batches) - 1:
            await asyncio.sleep(0.5)

    logger.info(f"Successfully embedded {len(texts)} texts")
    return results

async def embed_submissions(submissions: list[Submission], db: AsyncSession) -> None:
    """Embed submissions and save to database."""
    logger.info(f"Start embed_submissions for {len(submissions)} submissions")
    if not submissions:
        return

    processed_texts = [preprocess_text(s.content) for s in submissions]
    embeddings = await embed_texts(processed_texts)
    
    update_data = [
        {"id": sub.id, "embedding": emb}
        for sub, emb in zip(submissions, embeddings)
    ]
    
    await db.execute(update(Submission), update_data)
    await db.commit()
    logger.info(f"Embedded {len(submissions)} submissions")
