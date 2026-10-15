# overrides to s9pk.mk must precede the include statement
TS_CHECK := npx tsc --noEmit && npm test

# Upstream publishes Linux x86_64 and aarch64 only, so the default `make` must
# not try riscv64 — it would fail in the Dockerfile's platform case. The sibling
# Core and Knots flavors keep the SDK default of `x86 arm riscv`.
ARCHES := x86 arm
include node_modules/@start9labs/start-sdk/s9pk.mk

javascript/index.js: Makefile $(wildcard test/*.test.ts test/*.test.cjs)
