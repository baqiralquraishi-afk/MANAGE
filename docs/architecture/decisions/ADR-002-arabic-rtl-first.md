# ADR-002: Arabic RTL as Default System Locale

**Status:** Accepted  
**Date:** 13 November 2026

## Context

Humanity operates in Iraq where Arabic is the official working language of government agencies, local NGOs, field caseworkers, and affected communities. English is used by international donor liaisons and management auditors. Many systems treat Arabic as a secondary translation layer, resulting in broken RTL layouts, misaligned icons, and reversed Arabic/English mixed text strings.

## Decision

1. Arabic (`ar-IQ`) is designated as the default system locale across both Next.js Web Admin and Flutter Mobile.
2. Layouts default to Right-to-Left (RTL) with bidirectional CSS logical properties (`start`, `end`, `margin-inline-start`) and Flutter `Directionality`.
3. English (`en`) is supported as a first-class switchable secondary locale.
4. Typography is standardized on Cairo and IBM Plex Sans Arabic for legible rendering on both desktop and mobile screens.
5. All database error messages, audit event descriptions, and system categories must maintain dual Arabic/English representations.

## Consequences

- **Positive:** Superior native experience for Iraqi field teams; zero layout retrofitting needed for Arabic.
- **Negative:** Requires continuous visual verification on both RTL and LTR orientations during UI development.
