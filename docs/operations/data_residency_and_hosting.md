# Humanity Platform — Data Residency, Sovereignty & Hosting Review Guide

**Document Version:** 1.0.0  
**Effective Date:** 13 November 2026  
**Status:** Review Questionnaire for Organizational Authorities  
**Target Region:** Republic of Iraq (Federal Iraq & Kurdistan Region)

---

## 1. Executive Context

Humanitarian organizations operating in Iraq collect highly sensitive beneficiary data, including biometric identifiers, Iraqi Unified National Card numbers, displacement histories, household vulnerability rankings, and protection case records (survivors of gender-based violence, separated minors, and persons with heightened safeguarding needs).

Deploying this platform requires rigorous alignment with:

1. **Iraqi National Legal & Sovereign Frameworks:** Communications and Media Commission (CMC) data regulations, Iraqi Penal Code privacy provisions, and Federal / KRG cyber directives.
2. **International Humanitarian Mandates:** IASC Core Principles on Data Responsibility in Humanitarian Action and UN OCHA Centre for Humanitarian Data guidelines.
3. **Institutional Accountability:** Organizational Data Protection Officer (DPO) and Legal Counsel review.

---

## 2. Residency & Sovereign Hosting Questionnaire

The technical architecture supports two primary deployment topologies:

- **Option A (Recommended):** Sovereign In-Country Hosting on organization-owned bare-metal servers or private rack space in Baghdad (or Erbil).
- **Option B:** Approved Sovereign Cloud Provider operating physically within Iraqi borders (e.g., EarthLink Enterprise Cloud Baghdad, Zain Data Center Baghdad).
- **Option C:** International Humanitarian Cloud Tenancy (e.g. EU-sovereign AWS Frankfurt / Azure Dublin with dedicated encryption keys).

The following questions **must be formally answered by the organization's designated reviewers** before authorizing production deployment:

### Part I: Legal & Sovereign Regulatory Compliance

_For: Legal Counsel & Head of Mission_

1. **National Data Localization:** Does the organization have a formal bilateral memorandum of understanding (MoU) with the Government of Iraq (Ministry of Planning / CMC) or KRG that mandates in-country data residency for beneficiary registries?
2. **Cross-Border Transmission:** Are there legal prohibitions against routing encrypted database backup archives or anonymized statistical aggregates to regional coordination offices (e.g. Amman, Geneva) outside Iraqi territory?
3. **Law Enforcement & Subpoena Governance:** In the event of an official inspection request by local security or intelligence authorities, what institutional immunities (e.g. UN Convention on Privileges and Immunities, INGO framework agreements) protect the database from physical seizure?
4. **Legal Hold Authority:** Who holds the ultimate legal authority within the organization to issue a binding `is_legal_hold = true` order on beneficiary case files?

### Part II: Data Protection & Beneficiary Safeguarding

_For: Humanitarian Data Protection Officer (DPO) & Protection Cluster Lead_

5. **Informed Consent Validity:** Does the signed consent capture model (`explicit_written` / `guardian_attestation`) satisfy local legal age of majority rules across all Iraqi governorates?
6. **Biometric & National ID Retention:** What is the approved maximum retention window for scanned civil identity documents after case closure (default: 7 years per donor mandate)?
7. **K-Anonymity Thresholds:** Is the operational reporting suppression threshold ($k < 5$ individuals masked) deemed sufficient to prevent re-identification in low-density displacement settlements?
8. **Data Sharing with Cluster Partners:** Under what formal Data Sharing Agreements (DSAs) may verified beneficiary records be exchanged with UNHCR, WFP, or IOM to prevent multi-agency assistance duplication?

### Part III: Technical Infrastructure & Physical Security

_For: Chief Information Security Officer (CISO) & IT Infrastructure Lead_

9. **Data Center Physical Tiering:** Does the proposed hosting facility in Baghdad/Erbil meet Tier-III physical security standards (biometric access, 24/7 CCTV, dual-generator backup, fire suppression)?
10. **Hardware Security Modules (HSM):** Will database encryption at rest and MinIO SSE-C encryption keys be managed through an on-premise hardware HSM, or via an approved software vault (HashiCorp Vault Enterprise)?
11. **Disaster Recovery Secondary Site:** If the primary data center is located in Baghdad, is the disaster recovery replica site authorized to be located in Erbil (KRI), or must it reside in the same governorate?
12. **ISP Diversity & BGP Peering:** Are edge connections redundant across at least two independent national telecommunications providers (e.g. EarthLink fiber + Zain cellular backup) to withstand regional fiber cuts?

---

## 3. Required Reviewer Sign-Off Matrix

| Reviewer Role                            | Name & Title     | Review Scope                                     | Signature Status |
| :--------------------------------------- | :--------------- | :----------------------------------------------- | :--------------: |
| **Country Director / Head of Mission**   | _Pending Review_ | Sovereign jurisdiction & institutional mandate   |   `[PENDING]`    |
| **Legal Counsel (Iraq)**                 | _Pending Review_ | Iraqi law, CMC compliance, data sovereignty      |   `[PENDING]`    |
| **Humanitarian Data Protection Officer** | _Pending Review_ | DPIA approval, consent frameworks, donor privacy |   `[PENDING]`    |
| **Chief Information Security Officer**   | _Pending Review_ | Cryptographic roots, HSM, network boundaries     |   `[PENDING]`    |
| **Finance Operations Lead**              | _Pending Review_ | Dual-authorization thresholds & donor audits     |   `[PENDING]`    |
