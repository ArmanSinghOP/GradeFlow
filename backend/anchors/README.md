# Anchors

Anchor files contain pre-scored reference submissions used to calibrate the evaluation models.

## Expected Format
- One JSON file per anchor set.
- Filename must match the `anchor_set_id`.

## Schema
```json
{
  "anchor_set_id": "string — must match filename without .json",
  "content_type": "essay|code|report|interview",
  "description": "string — human readable description",
  "created_at": "ISO 8601 datetime string",
  "version": 1,
  "anchors": [
    {
      "id": "string — unique within the anchor set",
      "content": "string — the actual submission text",
      "human_scores": {
        "criterion_name": 8.0
      },
      "final_score": 8.0,
      "difficulty": "weak|developing|proficient|strong|exemplary",
      "notes": "string — optional evaluator notes"
    }
  ],
  "rubric_name": "string — name of the rubric this anchor set targets",
  "rubric_criteria": [
    {
      "name": "string",
      "weight": 1.0,
      "max_score": 10.0
    }
  ]
}
```

## Validation Rules
1. `anchor_set_id` must match the filename and contain only alphanumeric characters, hyphens, and underscores.
2. `content_type` must be one of: essay, code, report, interview.
3. Minimum 5 anchors per set (warn if < 10, error if < 5).
4. Maximum 50 anchors per set.
5. All anchor IDs must be unique within the set.
6. `rubric_criteria` weights must sum to 1.0.
7. Each anchor's `human_scores` must contain a key for every criterion in `rubric_criteria`.
8. Each score in `human_scores` must be between 0 and the criterion's `max_score`.
9. `final_score` must logically compute accurately from the individual values and criterion weights.
10. `difficulty` must be one of the 5 allowed values.
11. The anchor set must cover at least 3 distinct difficulty levels.
12. `version` must be a positive integer.

## Difficulty Levels
- **weak**: Clear fundamental misunderstandings
- **developing**: Partial understanding, significant gaps
- **proficient**: Meets expectations, minor issues
- **strong**: Above expectations, minor issues only
- **exemplary**: Exceptional, exceeds all criteria

## Recommendations
- Include at least 2 anchors at each extreme (weak, exemplary).
- Score anchors before seeing the cohort to avoid bias.
- Use the `/preview` endpoint to check calibration effect.
- Recommend at least 10 anchors for production use.

## API Endpoint Reference

- **GET /api/v1/anchors**
  List all anchor sets.
  Example: `curl http://localhost:8000/api/v1/anchors`

- **GET /api/v1/anchors/{id}**
  Get full anchor set properties.
  Example: `curl http://localhost:8000/api/v1/anchors/test-anchor`

- **POST /api/v1/anchors**
  Upload a new anchor set. Include full Schema Payload in Document shape.
  Example: `curl -X POST http://localhost:8000/api/v1/anchors -H 'Content-Type: application/json' -d '{"anchor_set_id": "..."}'`

- **PUT /api/v1/anchors/{id}**
  Overwrite an existing anchor set via ID.
  Example: `curl -X PUT http://localhost:8000/api/v1/anchors/test-anchor -H 'Content-Type: application/json' -d '{"anchor_set_id": "test-anchor", ...}'`

- **DELETE /api/v1/anchors/{id}**
  Erase an anchor set from local directories.
  Example: `curl -X DELETE http://localhost:8000/api/v1/anchors/test-anchor`

- **POST /api/v1/anchors/{id}/preview**
  Preview the evaluation offset applied across a list array of cohort aggregates mapping to sample_scores.
  Example: `curl -X POST http://localhost:8000/api/v1/anchors/test-anchor/preview -H 'Content-Type: application/json' -d '{"sample_scores": [5.0, 6.0, 7.0]}'`

- **POST /api/v1/anchors/{id}/validate**
  Verify the health metrics of the anchor stored locally on-disk.
  Example: `curl -X POST http://localhost:8000/api/v1/anchors/test-anchor/validate`
