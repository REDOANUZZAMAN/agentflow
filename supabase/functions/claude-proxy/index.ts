// Supabase Edge Function: Claude API Proxy
// Runs on Supabase's Deno runtime (outside China) to bypass region restrictions
// Endpoint: POST /functions/v1/claude-proxy

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Claude API key from Supabase secrets
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      messages,
      system,
      tools,
      tool_choice,
      model = "claude-sonnet-4-6",
      max_tokens = 4096,
      temperature,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Anthropic API request
    const anthropicBody: Record<string, unknown> = {
      model,
      max_tokens,
      messages,
    };

    if (system) anthropicBody.system = system;
    if (tools) anthropicBody.tools = tools;
    if (tool_choice) anthropicBody.tool_choice = tool_choice;
    if (temperature !== undefined) anthropicBody.temperature = temperature;

    console.log(`[claude-proxy] Calling Claude API: model=${model}, messages=${messages.length}`);

    // Call Anthropic Claude API
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`[claude-proxy] Anthropic API error ${anthropicRes.status}: ${errText}`);
      return new Response(
        JSON.stringify({
          error: `Claude API error: ${anthropicRes.status}`,
          details: errText,
        }),
        {
          status: anthropicRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return the Claude API response directly
    const data = await anthropicRes.json();
    console.log(`[claude-proxy] Success: stop_reason=${data.stop_reason}, content_blocks=${data.content?.length}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[claude-proxy] Error: ${message}`);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
