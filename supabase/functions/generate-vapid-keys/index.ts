import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );

    const pubJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;
    const privJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;

    if (!pubJwk.x || !pubJwk.y || !privJwk.d) {
      throw new Error("Failed to export JWK");
    }

    const x = base64UrlToUint8Array(pubJwk.x);
    const y = base64UrlToUint8Array(pubJwk.y);

    if (x.length !== 32 || y.length !== 32) {
      throw new Error("Invalid public JWK coordinates");
    }

    const rawPublic = new Uint8Array(65);
    rawPublic[0] = 0x04;
    rawPublic.set(x, 1);
    rawPublic.set(y, 33);

    const publicKey = uint8ArrayToBase64Url(rawPublic);
    const privateKey = privJwk.d;

    return new Response(JSON.stringify({ publicKey, privateKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
