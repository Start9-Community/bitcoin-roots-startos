# overrides to s9pk.mk must precede the include statement
TS_CHECK := npx tsc --noEmit && npm test

# Upstream publishes no riscv64 build.
ARCHES := x86 arm
include node_modules/@start9labs/start-sdk/s9pk.mk

javascript/index.js: Makefile $(wildcard test/*.test.ts test/*.test.cjs)
