# Anchors

Anchor files contain pre-scored reference submissions used to calibrate the evaluation models.

## Expected Format
- One JSON file per anchor set.
- Filename must match the `anchor_set_id`.

## Schema
```json
{
  "anchor_set_id": "string",
  "content_type": "essay|code|report|interview",
  "anchors": [
    {
      "id": "string",
      "content": "string",
      "human_scores": {
        "criterion_name": 8.0
      },
      "final_score": 8.0,
      "notes": "string"
    }
  ]
}
```

## Recommendations
We recommend providing a minimum of 10 anchors per set, carefully spanning the full score range from poor to excellent to ensure proper calibration.
