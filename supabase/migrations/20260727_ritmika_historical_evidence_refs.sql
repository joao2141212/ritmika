-- Historical evidence references preserved from the imported Koncluí response payload.
-- The source objects are public Supabase Storage images. We keep the original URL
-- as provenance until an optional private mirror is available; no source mutation occurs.

BEGIN;

WITH source_evidence AS (
    SELECT
        r.workspace_id,
        r.id AS response_id,
        r.checklist_id,
        r.profile_id,
        element->>'id' AS item_source_id,
        ev->>'id' AS source_evidence_id,
        ev->>'response' AS source_url,
        r.created_at AS response_created_at
    FROM ritmika_responses AS r
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(r.response_data) = 'array' THEN r.response_data
            ELSE '[]'::jsonb
        END
    ) AS element
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(element->'evidences') = 'array' THEN element->'evidences'
            ELSE '[]'::jsonb
        END
    ) AS ev
    WHERE jsonb_typeof(element) = 'object'
      AND jsonb_typeof(ev) = 'object'
      AND ev->>'response' ~* '^https?://'
), resolved AS (
    SELECT
        source.workspace_id,
        source.response_id,
        source.checklist_id,
        source.profile_id,
        item.id AS checklist_item_id,
        source.source_evidence_id,
        source.item_source_id,
        source.source_url,
        source.response_created_at,
        md5(concat_ws('|',
            source.workspace_id::text,
            source.response_id::text,
            source.item_source_id,
            source.source_url
        )) AS stable_source_id
    FROM source_evidence AS source
    LEFT JOIN ritmika_checklist_items AS item
      ON item.workspace_id = source.workspace_id
     AND item.checklist_id = source.checklist_id
     AND item.source_id = source.item_source_id
)
INSERT INTO ritmika_evidences (
    id,
    workspace_id,
    response_id,
    checklist_id,
    checklist_item_id,
    profile_id,
    source_id,
    kind,
    title,
    storage_bucket,
    storage_path,
    mime_type,
    metadata,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    resolved.workspace_id,
    resolved.response_id,
    resolved.checklist_id,
    resolved.checklist_item_id,
    resolved.profile_id,
    'konclui-evidence:' || resolved.stable_source_id,
    'photo',
    'Evidência histórica do Koncluí',
    'konclui-source',
    resolved.source_url,
    'image/*',
    jsonb_build_object(
        'historical_import', true,
        'source_provider', 'konclui',
        'source_url', resolved.source_url,
        'source_evidence_id', resolved.source_evidence_id,
        'source_item_id', resolved.item_source_id,
        'source_storage_bucket', 'images'
    ),
    resolved.response_created_at,
    resolved.response_created_at
FROM resolved
WHERE NOT EXISTS (
    SELECT 1
    FROM ritmika_evidences AS existing
    WHERE existing.workspace_id = resolved.workspace_id
      AND existing.source_id = 'konclui-evidence:' || resolved.stable_source_id
);

COMMIT;
