---
layout: post
title: "Building E2E Encrypted Communication Systems with Signal Protocol (in Rust) - Part 1"
summary: "Understanding end-to-end encryption and why it matters for secure communication"
author: khoaguin
date: '2025-11-14'
keywords: end-to-end-encryption, e2ee, pqxdh, signal-protocol, syftbox, privacy, security, ppml, libsignal, rust
thumbnail: /_attachments/e2ee/e2ee.png
permalink: /blog/e2ee-why-it-matters
tags:
  - cryptography
  - privacy
  - security
  - e2e-encryption
  - ppml
  - rust
---
![](/_attachments/e2ee/e2ee.png)

<div style="background: linear-gradient(135deg, rgba(42, 157, 143, 0.1), rgba(233, 196, 106, 0.1)); border-left: 4px solid #2a9d8f; padding: 1.5em; border-radius: 8px; margin: 2em 0;">

## 📌 TL;DR

End-to-end encryption isn't just about keeping secrets from a hacker / eavesdropper —
it's about building systems where users don't have to trust anyone but themselves,
including the service provider who offers the communication service (i.e. the server).

In this series, we'll build a simple E2E encrypted communication system that is **post-quantum secure**
based on the <a href="https://github.com/signalapp/libsignal" target="_blank" rel="noopener noreferrer">libsignal</a>
library from the Signal team using **Rust**.

**In Part 1 (this post), we'll cover:**
- 🎯 **Why** E2E encryption matters (security vs privacy vs trust)
- 🔐 **What** the Signal Protocol offers (and its limitations)
- 🏗️ **How** the protocol works conceptually (key exchange, encryption layers)
- 🧠 Theory behind PQXDH and post-quantum cryptography

**By the end of this 3-part series, you'll have implemented:**
- ✅ Post-quantum secure key exchange (PQXDH)
- ✅ End-to-end encrypted file sharing
- ✅ A working demo that encrypts and decrypts images

*Code coming in parts 2 and 3!*

</div>

---

## The Problem: Learning E2E Encryption is Hard

These days, I've been working on building an <a href="https://github.com/OpenMined/syft-crypto-core" target="_blank" rel="noopener noreferrer"> end-to-end encryption system </a>
for <a href="https://www.syftbox.net/" target="_blank" rel="noopener noreferrer">SyftBox</a> —
an open-source network for privacy-first, offline-capable AI.
However, when I started researching how to implement it based on <a href="https://github.com/signalapp/libsignal" target="_blank" rel="noopener noreferrer">libsignal</a>,
I felt like hitting a wall.

<img src="/_attachments/e2ee/signal.jpg" alt="Signal Protocol" style="float: right; margin: 0 0 1em 1em; max-width: 350px;">

The <a href="https://signal.org/docs/specifications/pqxdh/" target="_blank" rel="noopener noreferrer">Signal Protocol</a> is the gold standard for
implementing E2E encryption systems—it's what powers Signal, WhatsApp, and many other secure messaging apps.
However, the whitepaper is highly technical and rigorous, making it difficult to understand without
a strong cryptography background. I was trying to search for good learning materials that
bridge theory and practice, but couldn't find anything that really clicked. So I spent time
diving deep into the protocol, implementing it, and visualizing all the concepts to truly understand how it works.
This series shares what I learned, and my goal is to help you save time understanding and
implementing your own E2E encryption system using `libsignal`, with clear explanations and visual aids along the way.

<div style="clear: both;"></div>

---

## Security vs Privacy: Understanding the Difference

While **security** protects you against external eavesdroppers and attackers, **privacy** refers to your right to control how your personal information is collected, stored, and used. This distinction is crucial when comparing TLS (the technology behind HTTPS) and end-to-end encryption: 
- TLS provides security against external threats but still allows the service provider (server) to access your data
- E2EE delivers true privacy by ensuring that not even the service provider can read your messages—only you and your intended recipient hold the keys.

### TLS vs E2EE: A Visual Comparison

<div style="max-width: 100%; margin: 2em auto;">
<img src="/_attachments/e2ee/tls-vs-e2ee.svg" alt="TLS vs End-to-End Encryption Comparison" style="width: 100%; height: auto;" />
</div>

In the diagram above:
- **Traditional TLS Encryption** (left): The server decrypts and re-encrypts messages, meaning it can read your communications. This protects against external attackers but not against the service provider itself.
- **End-to-End Encryption** (right): The server only forwards encrypted data without being able to decrypt it. Only Alice and Bob can read the messages, giving you both security *and* privacy.

<div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1)); border-left: 4px solid #3b82f6; padding: 1.5em; border-radius: 8px; margin: 2em 0;">

**🤔 Why does the server need to decrypt and re-encrypt with TLS?**

The server keeps separate encryption keys with Alice and with Bob. When Alice sends a message, the server decrypts it using Alice's keys, then re-encrypts it using Bob's keys. This means the server sees the plaintext message in between—protecting you from network hackers, but not from the service provider itself.

</div>

---

## The Signal Protocol: Battle-Tested E2E Encryption

We will build our E2E encryption system based on <a href="https://signal.org/docs/specifications/pqxdh/" target="_blank" rel="noopener noreferrer">**Signal Protocol**</a> - the gold standard for E2E encrypted messaging:
- Used by Signal (obviously), WhatsApp, Facebook Messenger, Google Messages
- Protects billions of messages every day
- Open source and academically vetted

### Why Signal Protocol?

1. **Forward Secrecy** - New keys for every message
2. **Asynchronous** - Works even when recipients are offline
3. **Authenticated** - You know who sent each message
4. **Deniable** - Can't cryptographically prove who said what
5. **Post-Quantum Ready** - Updated to include Kyber for quantum resistance

### What is PQXDH?

**PQXDH** (Post-Quantum Extended Diffie-Hellman) is Signal's latest key agreement protocol, designed to resist quantum computers. It's currently implemented in the <a href="https://github.com/signalapp/libsignal" target="_blank" rel="noopener noreferrer">libsignal library</a> (as of Nov 2025) and will be the foundation of our E2E encryption system.

The basic idea:
- Alice and Bob each have several keys (identity, signed prekeys, quantum keys)
- They perform multiple Diffie-Hellman exchanges
- They combine the results into a shared secret
- This secret is used to derive encryption keys

We'll implement a **simplified 3-key version** in this series (we skip the optional one-time prekeys)

## References

- Signal. ["The PQXDH Key Agreement Protocol."](https://signal.org/docs/specifications/pqxdh/) Signal Specifications.
- Okta. ["Privacy vs. Security: What's the Difference?"](https://www.okta.com/identity-101/privacy-vs-security/) Okta Identity 101.

