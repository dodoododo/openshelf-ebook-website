package com.openshelf.exception;

public class BookException extends RuntimeException {
    private final int status;
    private final String code;

    public BookException(int status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
    public int getStatus() { return status; }
    public String getCode() { return code; }
    public static BookException notFound() { return new BookException(404, "BOOK_NOT_FOUND", "Book not found or unavailable"); }
    public static BookException invalidPdf() { return new BookException(400, "INVALID_PDF", "Choose a valid, unencrypted PDF with at least one page"); }
    public static BookException storage() { return new BookException(503, "STORAGE_UNAVAILABLE", "File storage is unavailable. Please try again later"); }
    public static BookException tooLarge() { return new BookException(413, "PAYLOAD_TOO_LARGE", "The PDF exceeds the configured upload limit"); }
}
