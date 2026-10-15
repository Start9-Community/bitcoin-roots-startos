# Build stage: download the upstream Bitcoin Roots release tarball, verify it
# against the pinned Plan ₿ Foundation release signer, and extract.
FROM debian:stable-slim AS builder

ARG VERSION
ARG TARGETPLATFORM

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates wget gnupg && \
    rm -rf /var/lib/apt/lists/*

# Pinned Bitcoin Roots release signer.
#
# Unlike Bitcoin Core (5-of-7) and Bitcoin Knots (3-of-5), Roots releases are
# signed by ONE key, so this is a 1-of-1 quorum and there is no tolerance for a
# compromised signer. That is upstream's release model, not a choice this
# package makes; REQUIRED_QUORUM is kept as a knob so adding a second signer
# later is a one-line change.
#
# Trust basis, stated plainly because it is weaker than it looks: upstream
# publishes this key ONLY as a comment block inside the SHA512SUMS file it
# signs. It is not on keys.openpgp.org, not in the repository's SECURITY.md or
# doc/release-process.md, and not in a builder-keys file. A key read out of the
# artifact it attests to proves nothing, so this build must never do that — it
# uses the copy committed to assets/release-keys/ and nothing else.
#
# What that copy buys is continuity, not identity: it was taken from the
# v29.4-roots.4 manifest and verified to be the same key that signed every
# Roots release back to the project's first (v29.3-roots.1, v30.3-roots.1 and
# v31.1-roots.1 all carry it). So verification here proves a release came from
# whoever signed the earlier ones. It does NOT independently establish that
# that party is the Plan ₿ Foundation. Treat a fingerprint change as a trust
# decision for a human, never a build fix: if upstream rotates, confirm the new
# key through a channel that is not the release manifest before touching this.
ENV PINNED_FINGERPRINTS="\
5EADD53F2CD1F0B7AEEE920D25FC5C29CD528E32"
ENV REQUIRED_QUORUM=1

# Roots publishes Linux x86_64 and aarch64 only — no riscv64 build exists, so
# that platform fails here rather than later with a confusing 404.
RUN case "${TARGETPLATFORM}" in \
      "linux/amd64")   echo "bitcoin-roots-linux-x86_64.tar.gz"  > /tarball-name ;; \
      "linux/arm64")   echo "bitcoin-roots-linux-aarch64.tar.gz" > /tarball-name ;; \
      *) echo "Unsupported platform: ${TARGETPLATFORM} (Roots publishes linux/amd64 and linux/arm64)" && exit 1 ;; \
    esac

# The tarball filenames carry no version — the git tag is the only thing that
# distinguishes releases, so VERSION must match the tag exactly minus the `v`.
RUN url="https://github.com/LuganoPlanB/bitcoin-roots/releases/download/v${VERSION}" && \
    wget -q "${url}/$(cat /tarball-name)" \
            "${url}/SHA512SUMS" \
            "${url}/SHA512SUMS.asc"

COPY assets/release-keys/ /tmp/release-keys/

# Verify SHA512SUMS.asc against the pinned signer set.
#
# The quorum counts DISTINCT signers, identified by primary fingerprint. GnuPG
# emits one status line per signature PACKET, so counting packets would let a
# single compromised key satisfy the quorum by signing REQUIRED_QUORUM times.
# VALIDSIG's last field is the signing key's primary fingerprint, so a
# signature made by a subkey rolls up to the signer that owns it. The Roots key
# has a signing subkey (0F0BDBE777B70E9D1C63117D02560B508C7FCB9D) and today
# signs with the primary; this resolves either to the same pinned primary.
#
# A VALIDSIG alone is not enough to count: GnuPG also emits one for a signature
# by an expired or revoked key, pairing it with EXPKEYSIG/REVKEYSIG instead of
# GOODSIG, so the walk below only counts a VALIDSIG whose signature reported
# GOODSIG.
#
# The keyring is asserted equal to the pinned primaries first, so the count can
# be taken over the keyring as a whole: a stray key dropped into
# assets/release-keys/ fails the build rather than voting in the quorum.
#
# gpg's exit code is unusable here: GnuPG 2.4+ returns non-zero for ERRSIG
# (signatures by signers outside the keyring) even when the pinned-key
# signatures verified fine.
RUN set -e; \
    export LC_ALL=C; \
    gpg --import /tmp/release-keys/*.asc; \
    rm -rf /tmp/release-keys; \
    : > /tmp/pinned-primaries.raw; \
    for fp in ${PINNED_FINGERPRINTS}; do \
        gpg --with-colons --list-keys "$fp" 2>/dev/null \
          | awk -F: '/^fpr:/{print $10; exit}' >> /tmp/pinned-primaries.raw; \
    done; \
    sort -u /tmp/pinned-primaries.raw > /tmp/pinned-primaries; \
    expected=$(echo ${PINNED_FINGERPRINTS} | wc -w); \
    if [ "$(wc -l < /tmp/pinned-primaries)" -ne "${expected}" ]; then \
        echo "PINNED KEY MISSING OR DUPLICATED (expected ${expected} distinct primaries)"; exit 1; \
    fi; \
    gpg --with-colons --list-keys \
      | awk -F: '/^pub:/{p=1} p && /^fpr:/{print $10; p=0}' | sort -u > /tmp/keyring-primaries; \
    if ! diff -q /tmp/pinned-primaries /tmp/keyring-primaries >/dev/null; then \
        echo "KEYRING CONTAINS KEYS OUTSIDE THE PINNED SET"; exit 1; \
    fi; \
    gpg --verify --status-fd 1 SHA512SUMS.asc SHA512SUMS 2>/dev/null > /tmp/gpg-status || true; \
    bad=$(grep -c '^\[GNUPG:\] BADSIG' /tmp/gpg-status || true); \
    signers=$(awk '/^\[GNUPG:\] NEWSIG/{g=0} /^\[GNUPG:\] GOODSIG/{g=1} /^\[GNUPG:\] VALIDSIG/{if(g)print $NF; g=0}' /tmp/gpg-status \
      | grep -Ex '[0-9A-F]{40}' | sort -u | comm -12 - /tmp/pinned-primaries | wc -l); \
    skipped=$(grep -cE '^\[GNUPG:\] (EXPKEYSIG|REVKEYSIG)' /tmp/gpg-status || true); \
    echo "Distinct pinned signers: ${signers}, bad: ${bad}, uncounted (expired/revoked key): ${skipped} (need ${REQUIRED_QUORUM}, 0)"; \
    if [ "${bad}" -ne 0 ]; then echo "BAD SIGNATURE FROM PINNED KEY"; exit 1; fi; \
    if [ "${signers}" -lt "${REQUIRED_QUORUM}" ]; then echo "INSUFFICIENT QUORUM"; exit 1; fi

# Anchor the filename to end-of-line: SHA512SUMS also lists the .patch and the
# other platforms' archives, and an unanchored match would check the wrong one.
# `sha512sum -c` fails on an empty stdin, so a filename missing from the
# manifest fails here too.
RUN grep " $(cat /tarball-name)$" SHA512SUMS | sha512sum -c

# Archive root is bitcoin-roots-<VERSION>/ — stripped so paths below are stable.
RUN tar -xzf "$(cat /tarball-name)" --strip-components=1

# Final image
FROM debian:stable-slim

ENV BITCOIN_DATA=/root/.bitcoin
ENV BITCOIN_PREFIX=/opt/bitcoin
ENV PATH=${BITCOIN_PREFIX}/bin:$PATH

# curl is load-bearing: the assumeutxo action shells out to it in this image to
# download the UTXO snapshot, and that is an https URL, so ca-certificates is
# named explicitly rather than left to curl's recommends.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates curl e2fsprogs jq yq && \
    rm -rf /var/lib/apt/lists/*

# The 29.4 Roots archive ships bin/ and share/ only. Core 31.x additionally
# ships libexec/bitcoin-node for its IPC mode; there is nothing to copy here,
# and the package exposes no IPC action for that reason.
COPY --from=builder /build/bin/bitcoind ${BITCOIN_PREFIX}/bin/
COPY --from=builder /build/bin/bitcoin-cli ${BITCOIN_PREFIX}/bin/

EXPOSE 8332 8333
