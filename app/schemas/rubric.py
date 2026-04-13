from pydantic import BaseModel, model_validator
import math

class RubricCriterion(BaseModel):
    name: str
    description: str
    weight: float
    max_score: float = 10.0

class RubricDefinition(BaseModel):
    name: str
    description: str
    criteria: list[RubricCriterion]

    @model_validator(mode='after')
    def validate_weights(self):
        if not (1 <= len(self.criteria) <= 10):
            raise ValueError("Rubric must have 1 to 10 criteria.")
        total_weight = sum(c.weight for c in self.criteria)
        if not math.isclose(total_weight, 1.0, abs_tol=0.001):
            raise ValueError(f"Criterion weights must sum to 1.0, got {total_weight}")
        return self
