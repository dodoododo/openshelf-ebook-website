# OpenShelf — Product Overview

## 1. Vision & Purpose

**OpenShelf** is a modern full-stack digital library and social reading platform designed to provide readers, students, and book enthusiasts with a clean, high-performance web environment to discover, upload, read, organize, annotate, and share books.

The platform bridges the gap between a personal digital book vault and a community-oriented social reading hub. It focuses on a distraction-free, responsive reading interface paired with robust metadata management, multi-device reading synchronization, and strict document privacy controls.

## 2. Core Value Propositions

- **Centralized Digital Vault:** Users can upload their personal PDF books into a secure, private cloud archive with consistent metadata extraction and indexing.
- **Distraction-Free Web Reader:** High-fidelity in-browser PDF rendering with responsive single-page and double-page viewing, fluid vertical or horizontal navigation, zoom controls, full-screen reading, and persistent reading positions.
- **Deep Personal Annotations:** Seamless creation of highlights, colored bookmarks, structured table-of-contents bookmarks, and page-anchored personal notes that remain completely private to each reader.
- **Curated Community Publishing:** A structured publishing workflow enabling authorized and public-domain literature to be reviewed by administrators and shared across the OpenShelf community, complete with discovery, search, and social engagement.

## 3. User Roles & Personas

| Role | Description | Core Capabilities |
| :--- | :--- | :--- |
| **Guest / Visitor** | Unauthenticated user browsing public offerings | Browse public book catalog, preview book metadata, read platform overview |
| **Registered Reader** | Authenticated platform user | Upload private books, access personal library, read, annotate, bookmark, submit books for publication, manage profile |
| **Administrator** | Content & Platform Moderator | Review publication requests, approve/reject community submissions, monitor platform health, manage users |

## 4. Key Architectural Differentiators

- **Strict Document Boundary Isolation:** A single underlying document or publication may be referenced by multiple readers, but all reading activity (progress, bookmarks, highlights, notes, and view preferences) is strictly private to each reader account.
- **Enterprise-Grade Foundation:** Built on a production-ready Java 21 LTS + Spring Boot 4.1.2 backend and a modular React 19 + TypeScript + Vite + Tailwind CSS v4 frontend.
- **Scalable Layered Design:** Clean separation of concerns using traditional Layered Architecture for predictable long-term maintainability.
