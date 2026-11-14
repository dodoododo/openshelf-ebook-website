package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.openshelf.dto.request.BookUploadRequest;
import com.openshelf.entity.User;
import com.openshelf.repository.BookRepository;
import com.openshelf.repository.BookFileRepository;
import com.openshelf.repository.UserRepository;
import com.openshelf.security.OpenShelfPrincipal;
import com.openshelf.service.BookService;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "openshelf.upload.max-bytes=16384", "spring.servlet.multipart.max-file-size=16KB",
    "spring.servlet.multipart.max-request-size=32KB", "server.servlet.session.cookie.secure=false",
    "server.servlet.session.cookie.name=openshelf-session"
})
@AutoConfigureMockMvc
class BookIntegrationTests extends PostgresIntegrationTest {
    private final MockMvc mvc;
    private final JsonMapper json;
    private final BookService service;
    private final BookRepository books;
    private final BookFileRepository files;
    private final UserRepository users;
    private final String root;
    private final int port;

    @Autowired
    BookIntegrationTests(MockMvc mvc, JsonMapper json, BookService service, BookRepository books,
            BookFileRepository files, UserRepository users, @Value("${openshelf.storage.root}") String root,
            @Value("${local.server.port}") int port) {
        this.mvc = mvc; this.json = json; this.service = service; this.books = books;
        this.files = files; this.users = users; this.root = root; this.port = port;
    }

    record Reader(UUID id, MockHttpSession session, String csrf) { }
    private byte[] pdf() throws Exception { return Files.readAllBytes(Path.of("../frontend/public/sample.pdf")); }
    private MockMultipartFile part(String name, byte[] bytes) { return new MockMultipartFile("file", name, "application/octet-stream", bytes); }
    private Reader reader() throws Exception {
        User user = users.saveAndFlush(new User(UUID.randomUUID()+"@example.com", "unused-test-hash", "Private Reader", java.time.Instant.now()));
        var principal = new OpenShelfPrincipal(user);
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())));
        MvcResult token = mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn();
        return new Reader(user.getId(), session, json.readTree(token.getResponse().getContentAsString()).path("data").path("token").asText());
    }
    private ResultActions upload(Reader reader, String name, byte[] bytes) throws Exception {
        return mvc.perform(multipart("/api/v1/books").file(part(name, bytes)).param("title", "Private reading")
                .param("author", "A Reader").param("description", "A private test PDF")
                .session(reader.session()).header("X-CSRF-TOKEN", reader.csrf()));
    }
    private UUID uploadedId(Reader reader) throws Exception {
        return UUID.fromString(json.readTree(upload(reader, "sample.pdf", pdf()).andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()).path("data").path("id").asText());
    }

    @Test
    void validUploadIsPrivateOwnedHasSafeMetadataAndAuthenticBytes() throws Exception {
        Reader reader = reader();
        MvcResult uploaded = upload(reader, "../../sensitive\\SAMPLE.PDF", pdf()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.data.file.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.data.file.originalFilename").value("SAMPLE.PDF"))
                .andExpect(jsonPath("$.data.file.pageCount").value(5))
                .andExpect(jsonPath("$.data.file.version").value(1))
                .andExpect(jsonPath("$.data.file.storageKey").doesNotExist()).andReturn();
        String id = json.readTree(uploaded.getResponse().getContentAsString()).path("data").path("id").asText();
        assertThat(books.findById(UUID.fromString(id)).orElseThrow().getOwnerId()).isEqualTo(reader.id());
        var stored = files.findOwned(UUID.fromString(id), reader.id(), org.springframework.data.domain.PageRequest.of(0, 1)).getFirst();
        assertThat(stored.getStorageKey()).matches("[0-9a-f-]{36}\\.pdf");
        assertThat(stored.getSha256()).isEqualTo(java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(pdf())));
        assertThat(uploaded.getResponse().getContentAsString()).doesNotContain(root, "storageKey", "passwordHash");
        mvc.perform(get("/api/v1/books/"+id).session(reader.session())).andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(id));
        mvc.perform(get("/api/v1/books/mine").param("size", "1").session(reader.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.totalElements").value(1)).andExpect(jsonPath("$.data[0].id").value(id));
        mvc.perform(get("/api/v1/books/"+id+"/file").session(reader.session())).andExpect(status().isOk())
                .andExpect(content().bytes(pdf())).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Type", "application/pdf"));
    }

    @Test
    void rangesAndUnsatisfiableRangesAreCorrect() throws Exception {
        Reader reader = reader(); String url = "/api/v1/books/"+uploadedId(reader)+"/file";
        mvc.perform(get(url).session(reader.session()).header("Range", "bytes=0-15")).andExpect(status().isPartialContent())
                .andExpect(header().string("Content-Range", "bytes 0-15/"+pdf().length))
                .andExpect(content().bytes(java.util.Arrays.copyOfRange(pdf(), 0, 16)));
        mvc.perform(get(url).session(reader.session()).header("Range", "bytes=-10")).andExpect(status().isPartialContent())
                .andExpect(content().bytes(java.util.Arrays.copyOfRange(pdf(), pdf().length-10, pdf().length)));
        mvc.perform(get(url).session(reader.session()).header("Range", "bytes=999999-")).andExpect(status().isRequestedRangeNotSatisfiable())
                .andExpect(header().string("Content-Range", "bytes */"+pdf().length));
    }

    @Test
    void secondUserCannotReadMetadataOrBytesOrListAnotherUsersBook() throws Exception {
        Reader first = reader(), second = reader(); UUID id = uploadedId(first);
        mvc.perform(get("/api/v1/books/"+id).session(second.session())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/books/"+id+"/file").session(second.session()).header("Range", "bytes=0-10")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/books/mine").session(second.session())).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get("/api/v1/books/"+id+"/file")).andExpect(status().isUnauthorized());
    }

    @Test
    void invalidIdentifiersAndPaginationAreRejected() throws Exception {
        Reader reader = reader();
        mvc.perform(get("/api/v1/books/not-a-uuid").session(reader.session())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/books/"+UUID.randomUUID()).session(reader.session())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/books/mine?size=51").session(reader.session())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/books/mine?page=-1").session(reader.session())).andExpect(status().isBadRequest());
    }

    @Test
    void invalidEmptyMalformedEncryptedAndOversizedFilesLeaveNoStoredFiles() throws Exception {
        Reader reader = reader(); long before = fileCount();
        upload(reader, "image.png", pdf()).andExpect(status().isBadRequest());
        upload(reader, "empty.pdf", new byte[0]).andExpect(status().isBadRequest());
        upload(reader, "bad.pdf", "%PDF-1.7\ninvalid".getBytes()).andExpect(status().isBadRequest());
        upload(reader, "fake.pdf", "not a PDF".getBytes()).andExpect(status().isBadRequest());
        upload(reader, "large.pdf", new byte[16385]).andExpect(status().isPayloadTooLarge());
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.protect(new StandardProtectionPolicy("owner-secret", "", new AccessPermission()));
            document.save(bytes);
            upload(reader, "encrypted.pdf", bytes.toByteArray()).andExpect(status().isBadRequest());
        }
        assertThat(fileCount()).isEqualTo(before);
    }

    @Test
    void ownerAndVisibilityCannotBeInjectedAndMetadataIsValidated() throws Exception {
        Reader reader = reader();
        MvcResult result = mvc.perform(multipart("/api/v1/books").file(part("sample.pdf", pdf()))
                .param("title", "Owned").param("author", "Author").param("ownerId", UUID.randomUUID().toString())
                .param("visibility", "PUBLIC").session(reader.session()).header("X-CSRF-TOKEN", reader.csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.visibility").value("PRIVATE")).andReturn();
        UUID id = UUID.fromString(json.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText());
        assertThat(books.findById(id).orElseThrow().getOwnerId()).isEqualTo(reader.id());
        mvc.perform(multipart("/api/v1/books").file(part("sample.pdf", pdf())).param("title", " ").param("author", " ")
                .session(reader.session()).header("X-CSRF-TOKEN", reader.csrf())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details").isNotEmpty());
    }

    @Test
    void multipartRequiresAuthenticationAndCsrf() throws Exception {
        Reader reader = reader();
        mvc.perform(multipart("/api/v1/books").file(part("sample.pdf", pdf())).session(reader.session())).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/v1/books").file(part("sample.pdf", pdf())).session(reader.session()).header("X-CSRF-TOKEN", "bad"))
                .andExpect(status().isForbidden());
        MvcResult anonymous = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        String token = json.readTree(anonymous.getResponse().getContentAsString()).path("data").path("token").asText();
        mvc.perform(multipart("/api/v1/books").file(part("sample.pdf", pdf())).session((MockHttpSession) anonymous.getRequest().getSession())
                .header("X-CSRF-TOKEN", token)).andExpect(status().isUnauthorized());
    }

    @Test
    void databaseConstraintFailureRollsBackMetadataAndRemovesTheFile() throws Exception {
        long before = fileCount(), rows = books.count();
        assertThatThrownBy(() -> service.upload(UUID.randomUUID(), new BookUploadRequest("Failure", "Author", ""), part("sample.pdf", pdf())))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(fileCount()).isEqualTo(before);
        assertThat(books.count()).isEqualTo(rows);
    }

    private long fileCount() throws Exception { try (var list = Files.list(Path.of(root))) { return list.count(); } }

    @Test
    void servletMultipartSizeLimitReturnsTheStandard413Envelope() throws Exception {
        var cookies = new java.net.CookieManager(null, java.net.CookiePolicy.ACCEPT_ALL);
        var client = java.net.http.HttpClient.newBuilder().cookieHandler(cookies).build();
        String base = "http://127.0.0.1:" + port;
        var csrfRequest = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+"/api/v1/auth/csrf")).GET().build();
        var csrfResponse = client.send(csrfRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
        String token = json.readTree(csrfResponse.body()).path("data").path("token").asText();
        String email = UUID.randomUUID()+"@example.com";
        String password = "A long multipart test passphrase";
        String registration = json.writeValueAsString(java.util.Map.of("email", email, "password", password, "displayName", "Limit Reader"));
        var register = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+"/api/v1/auth/register"))
                .header("Content-Type", "application/json").header("X-CSRF-TOKEN", token)
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(registration)).build();
        assertThat(client.send(register, java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(201);
        var login = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+"/api/v1/auth/login"))
                .header("Content-Type", "application/json").header("X-CSRF-TOKEN", token)
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(json.writeValueAsString(java.util.Map.of("email", email, "password", password)))).build();
        assertThat(client.send(login, java.net.http.HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        token = json.readTree(client.send(csrfRequest, java.net.http.HttpResponse.BodyHandlers.ofString()).body()).path("data").path("token").asText();
        byte[] body = ("--test-boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\"large.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"
                + "x".repeat(17000) + "\r\n--test-boundary--\r\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base+"/api/v1/books"))
                .header("Content-Type", "multipart/form-data; boundary=test-boundary").header("X-CSRF-TOKEN", token)
                .POST(java.net.http.HttpRequest.BodyPublishers.ofByteArray(body)).build();
        var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(json.readTree(response.body()).path("error").path("code").asText()).isEqualTo("PAYLOAD_TOO_LARGE");
    }
}
