-- api-status stored raw fetch error messages, which quote the request URL. For the Twitch token
-- request that URL carried client_id and client_secret, and api_status_events is publicly readable.
-- Strip every query string from stored details. The function now sends credentials in the body.
UPDATE public.api_status_events
SET detail = regexp_replace(detail, '(https?://[^\s?#)"'']+)[?#][^\s)"'']*', '\1?…', 'g')
WHERE detail ~ 'https?://[^\s]*[?#]';
