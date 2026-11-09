# OpenShelf — Business Rules & Governance

## 1. Confirmed Business Rules

### BR-01: Book Privacy Default
- Every uploaded book starts in `PRIVATE` status.
- A private book is visible and accessible **only** to the user who uploaded it.
- No other user or anonymous guest can search, view metadata, or stream the PDF of a private book.

### BR-02: Public Publication Approval Workflow
- A user may submit a publication request for their uploaded private book.
- The book transitions to `PENDING_REVIEW` status.
- Only users with `ROLE_ADMIN` can approve or reject a publication request.
- When approved, the book status transitions to `PUBLIC`.
- When rejected, the book returns to `PRIVATE` status with optional reviewer feedback.
- Administrative approval does not replace copyright compliance; the uploader must confirm the work is public domain or properly licensed for distribution.

### BR-03: Reader Data Boundary & Independence
- Multiple readers may read the same public or shared book document.
- Reading progress, finished status, bookmarks, highlights, notes, and reading preferences are strictly scoped to the `(user_id, book_id)` tuple.
- No user can access or infer another user's reading data or personal annotations.

### BR-04: User Roles & Access Control
- `ROLE_USER`: Can upload books, read accessible books, manage personal library, and submit publication requests.
- `ROLE_ADMIN`: Inherits all user capabilities plus publication moderation, user account administration, and platform audit visibility.

---

## 2. Proposed Business Rules (Pending Team Review)

> [!NOTE]
> The rules in this section are preliminary proposals designed to provide a consistent operational baseline. They must be validated during their respective implementation phases.

### PR-01: Book File Storage & Deduplication
- **Proposal:** Calculate SHA-256 hash upon file upload. If an identical file exists in the storage bucket, reuse storage reference while maintaining independent book records and access controls.

### PR-02: File Size & Format Restrictions
- **Proposal:** Initial PDF file size limit of 50 MB per upload for standard users. Non-PDF file types are rejected during initial validation.

### PR-03: Deletion Policy
- **Proposal:** When a user deletes a private book, all associated personal progress, highlights, and bookmarks are cascade-deleted. If a public book with multiple active readers is retracted, existing active readers retain access or the book is archived rather than immediately deleted for all users.

---

## 3. Unresolved Decisions & Questions

1. **Storage Backend Transition:** When migrating from local storage to Amazon S3, will signed URLs (presigned GETs) be used directly by the frontend reader or proxied through the Spring Boot API?
2. **Annotation Anchoring Strategy:** Should PDF text highlights store text offsets, character bounding boxes (normalized coordinates), or PDF native annotation objects?
3. **EPUB Support Timing:** Should the EPUB rendering architecture be planned alongside PDF.js or deferred until PDF stability is proven?
