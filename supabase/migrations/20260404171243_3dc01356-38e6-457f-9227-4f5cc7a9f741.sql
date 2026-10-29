CREATE OR REPLACE FUNCTION public.accept_article_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite public.article_collaborators%ROWTYPE;
  v_claimed public.article_collaborators%ROWTYPE;
  v_article public.articles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT *
  INTO v_invite
  FROM public.article_collaborators
  WHERE invite_token = p_token
    AND accepted = false
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  SELECT *
  INTO v_article
  FROM public.articles
  WHERE id = v_invite.article_id;

  IF v_article IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article not found');
  END IF;

  IF v_article.user_id = auth.uid() OR public.is_article_collaborator(auth.uid(), v_invite.article_id) THEN
    RETURN jsonb_build_object('success', true, 'article_id', v_invite.article_id);
  END IF;

  UPDATE public.article_collaborators
  SET user_id = auth.uid(),
      accepted = true,
      invite_token = NULL,
      updated_at = now()
  WHERE id = v_invite.id
    AND accepted = false
  RETURNING * INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite was already used');
  END IF;

  RETURN jsonb_build_object('success', true, 'article_id', v_claimed.article_id);
EXCEPTION
  WHEN unique_violation THEN
    IF v_article.user_id = auth.uid() OR public.is_article_collaborator(auth.uid(), v_invite.article_id) THEN
      RETURN jsonb_build_object('success', true, 'article_id', v_invite.article_id);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'This invite has already been claimed');
END;
$function$;