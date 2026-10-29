
CREATE OR REPLACE FUNCTION public.create_rw_workspace(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws rw_workspaces%ROWTYPE;
BEGIN
  INSERT INTO rw_workspaces (name, owner_id)
  VALUES (p_name, auth.uid())
  RETURNING * INTO v_ws;

  INSERT INTO rw_members (workspace_id, user_id, role)
  VALUES (v_ws.id, auth.uid(), 'owner');

  RETURN jsonb_build_object(
    'id', v_ws.id,
    'name', v_ws.name,
    'icon', v_ws.icon,
    'owner_id', v_ws.owner_id,
    'created_at', v_ws.created_at,
    'updated_at', v_ws.updated_at
  );
END;
$$;
