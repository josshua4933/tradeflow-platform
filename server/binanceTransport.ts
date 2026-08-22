import https from "node:https";

/**
 * Binance's public edge can intermittently reset Node's default address-family
 * negotiation in restricted runtimes. Pinning the public REST client to IPv4
 * keeps the request path aligned with the reachable market-data endpoint.
 */
export const BINANCE_HTTPS_AGENT = new https.Agent({
  family: 4,
  keepAlive: true,
});
