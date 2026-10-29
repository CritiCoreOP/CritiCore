import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** The one admin call needed here; structural, so every supabase-js client type fits */
interface AdminClient {
  auth: {
    admin: {
      listUsers(params: { page: number; perPage: number }): Promise<{ data: { users: { id: string; email?: string }[] } | null; error: unknown }>;
    };
  };
}

const PER_PAGE = 1000;
const MAX_PAGES = 100;

async function findUserByEmail(admin: AdminClient, email: string) {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < PER_PAGE) return null;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const TGN_APIKEY = Deno.env.get('TGN_APIKEY');
  const TGN_SUPABASE_URL = Deno.env.get('TGN_SUPABASE_URL');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!TGN_APIKEY || !TGN_SUPABASE_URL) {
    return new Response(JSON.stringify({ error: 'TGN credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email: rawEmail, token, redirect_uri } = await req.json();
    // One spelling for lookup and comparison; auth stores addresses in lower case
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

    if (!email || !token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing email or token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate token with TGN
    const response = await fetch(
      `${TGN_SUPABASE_URL}/functions/v1/validate-auth-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': TGN_APIKEY,
        },
        body: JSON.stringify({
          action: 'validate',
          email,
          token,
          redirect_uri: redirect_uri || '',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return new Response(JSON.stringify({ success: false, error: data.error || 'Token validation failed' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The session is created for this address, so it must be the one TGN vouched for. If TGN names
    // the account's address, it has to match the requested one exactly.
    const tgnEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : null;
    if (tgnEmail && tgnEmail !== email) {
      return new Response(JSON.stringify({ success: false, error: 'Token belongs to another account' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Token is valid — now create/sign in user in local Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user exists. listUsers() returns one page (50 by default), so walk all pages: before,
    // every account beyond the first page looked new, createUser failed and the login broke
    const existingUser = await findUserByEmail(supabaseAdmin, email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user with a random password (they'll always login via TGN)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: data.display_name || email.split('@')[0],
          provider: 'tgn',
        },
      });
      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ success: false, error: createError?.message || 'Failed to create user' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = newUser.user.id;
    }

    // Generate a magic link / session for the user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      return new Response(JSON.stringify({ success: false, error: linkError?.message || 'Failed to generate session' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token hash to let the client verify it
    const tokenHash = linkData.properties?.hashed_token;
    
    return new Response(JSON.stringify({ 
      success: true, 
      token_hash: tokenHash,
      email,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
